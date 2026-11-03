import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { QueryClient } from "@tanstack/react-query";
import type { LinksSnapshot, ShortLink } from "./links-api";
import {
	createLinkToggleController,
	createToggleLinkMutationOptions,
	type LinkToggleRequest,
	linkKeys,
} from "./links-queries";

function makeLink(code: string, enabled: boolean): ShortLink {
	return {
		code,
		title: code,
		destination: `https://example.com/${code}`,
		enabled,
		shortUrl: `https://elvo.link/${code}`,
		totalClicks: 0,
		createdAt: "2026-11-01T00:00:00.000Z",
		updatedAt: "2026-11-01T00:00:00.000Z",
	};
}

function makeSnapshot(
	links: ShortLink[],
	page = 1,
	total = links.length,
): LinksSnapshot {
	return {
		links,
		quota: { used: total, limit: 100, remaining: 100 - total },
		page,
		pageSize: 10,
		total,
		totalPages: Math.max(1, Math.ceil(total / 10)),
	};
}

function deferred<T>() {
	let resolve!: (value: T | PromiseLike<T>) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});
	return { promise, resolve, reject };
}

async function flushAsync() {
	await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe("link toggle concurrency", () => {
	it("rolls back only the failed link across cached pages after out-of-order responses", async () => {
		const queryClient = new QueryClient();
		const alpha = makeLink("alpha", true);
		const beta = makeLink("beta", true);
		const pageOneKey = linkKeys.list({ query: "", status: "all", page: 1 });
		const activePageTwoKey = linkKeys.list({
			query: "link",
			status: "active",
			page: 2,
		});
		queryClient.setQueryData(pageOneKey, makeSnapshot([alpha, beta], 1, 12));
		queryClient.setQueryData(activePageTwoKey, makeSnapshot([alpha], 2, 12));

		const alphaResponse = deferred<{ link: ShortLink }>();
		const betaResponse = deferred<{ link: ShortLink }>();
		const mutationFn = ({ code }: { code: string; enabled: boolean }) =>
			code === "alpha" ? alphaResponse.promise : betaResponse.promise;
		const options = createToggleLinkMutationOptions(queryClient, mutationFn);
		const alphaMutation = queryClient
			.getMutationCache()
			.build(queryClient, options);
		const betaMutation = queryClient
			.getMutationCache()
			.build(queryClient, options);

		const alphaRequest = alphaMutation.execute({
			code: "alpha",
			enabled: false,
		});
		const betaRequest = betaMutation.execute({ code: "beta", enabled: false });
		await flushAsync();

		assert.deepEqual(
			queryClient
				.getQueryData<LinksSnapshot>(pageOneKey)
				?.links.map((link) => [link.code, link.enabled]),
			[
				["alpha", false],
				["beta", false],
			],
		);

		betaResponse.resolve({ link: { ...beta, enabled: false } });
		await betaRequest;
		alphaResponse.reject(new Error("alpha request failed"));
		await assert.rejects(alphaRequest);

		const pageOne = queryClient.getQueryData<LinksSnapshot>(pageOneKey);
		const activePageTwo =
			queryClient.getQueryData<LinksSnapshot>(activePageTwoKey);
		assert.deepEqual(
			pageOne?.links.map((link) => [link.code, link.enabled]),
			[
				["alpha", true],
				["beta", false],
			],
		);
		assert.equal(pageOne?.page, 1);
		assert.equal(pageOne?.total, 12);
		assert.equal(activePageTwo?.links[0]?.enabled, true);
		assert.equal(activePageTwo?.page, 2);
		assert.equal(activePageTwo?.total, 12);
		queryClient.clear();
	});

	it("serializes one link, keeps another link usable, and queues Undo behind a pending request", async () => {
		const alpha = makeLink("alpha", true);
		const beta = makeLink("beta", true);
		const requests: Array<{
			request: LinkToggleRequest;
			response: ReturnType<typeof deferred<void>>;
		}> = [];
		const pendingChanges: Array<[string, boolean]> = [];
		const serverState = new Map([
			["alpha", true],
			["beta", true],
		]);
		const controller = createLinkToggleController(
			async (request) => {
				const response = deferred<void>();
				requests.push({ request, response });
				await response.promise;
				serverState.set(request.link.code, request.enabled);
			},
			(code, pending) => pendingChanges.push([code, pending]),
		);

		controller.request({ link: alpha, enabled: false });
		controller.request({
			link: { ...alpha, enabled: false },
			enabled: true,
			undo: true,
		});
		controller.request({ link: beta, enabled: false });

		assert.equal(controller.isPending("alpha"), true);
		assert.equal(controller.isPending("beta"), true);
		assert.deepEqual(
			requests.map(({ request }) => [request.link.code, request.enabled]),
			[
				["alpha", false],
				["beta", false],
			],
		);

		requests[1]?.response.resolve();
		await flushAsync();
		requests[0]?.response.reject(new Error("alpha request failed"));
		await flushAsync();

		assert.deepEqual(
			requests.map(({ request }) => [request.link.code, request.enabled]),
			[
				["alpha", false],
				["beta", false],
				["alpha", true],
			],
		);
		requests[2]?.response.resolve();
		await flushAsync();

		assert.equal(serverState.get("alpha"), true);
		assert.equal(serverState.get("beta"), false);
		assert.equal(controller.isPending("alpha"), false);
		assert.equal(controller.isPending("beta"), false);
		assert.deepEqual(pendingChanges, [
			["alpha", true],
			["beta", true],
			["beta", false],
			["alpha", false],
		]);
	});
});
