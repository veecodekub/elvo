"use client";

import { Badge } from "@elvo/ui/components/badge";
import { Button } from "@elvo/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@elvo/ui/components/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@elvo/ui/components/dialog";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@elvo/ui/components/empty";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@elvo/ui/components/field";
import { Input } from "@elvo/ui/components/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@elvo/ui/components/input-group";
import { Skeleton } from "@elvo/ui/components/skeleton";
import {
	ArrowUpRight,
	Copy,
	Download,
	Link2,
	QrCode,
	RefreshCw,
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import {
	type FormEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";

import type { authClient } from "@/lib/auth-client";
import {
	createShortLink,
	type LinkQuota,
	LinksApiError,
	listLinks,
	type ShortLink,
} from "@/lib/links-api";

const DESTINATION_ERROR =
	"Enter a valid HTTP or HTTPS URL, for example https://example.com.";
const GENERIC_CREATE_ERROR =
	"We couldn't create your link. Check your connection and try again.";
const GENERIC_LOAD_ERROR = "We couldn't load your links. Try again.";

const MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

function isHttpUrl(value: string) {
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
}

function hostnameOf(value: string) {
	try {
		return new URL(value).hostname;
	} catch {
		return value;
	}
}

function linkTitle(link: ShortLink) {
	return link.title ?? hostnameOf(link.destination);
}

function formatCreatedAt(value: string) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	const pad = (part: number) => String(part).padStart(2, "0");
	return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}, ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`;
}

function QrDownload({ link }: { link: ShortLink }) {
	const canvas = useRef<HTMLCanvasElement>(null);

	function download() {
		const dataUrl = canvas.current?.toDataURL("image/png");
		if (!dataUrl) return;
		const anchor = document.createElement("a");
		anchor.href = dataUrl;
		anchor.download = `elvo-${link.code}.png`;
		document.body.append(anchor);
		anchor.click();
		anchor.remove();
	}

	return (
		<div className="flex flex-col items-center gap-4">
			<QRCodeCanvas
				ref={canvas}
				value={link.shortUrl}
				size={240}
				marginSize={4}
				title={`QR code for ${link.shortUrl}`}
				role="img"
				aria-label={`QR code for ${link.shortUrl}`}
			/>
			<code className="break-all text-center text-xs">{link.shortUrl}</code>
			<p className="text-muted-foreground text-sm">
				Anyone who scans this code opens the short link.
			</p>
			<Button onClick={download}>
				<Download data-icon="inline-start" />
				Download PNG
			</Button>
		</div>
	);
}

export default function Dashboard({
	session,
}: {
	session: typeof authClient.$Infer.Session;
}) {
	const [links, setLinks] = useState<ShortLink[]>([]);
	const [quota, setQuota] = useState<LinkQuota>({
		used: 0,
		limit: 100,
		remaining: 100,
	});
	const [createdLink, setCreatedLink] = useState<ShortLink | null>(null);
	const [qrLink, setQrLink] = useState<ShortLink | null>(null);
	const [destinationError, setDestinationError] = useState<string | null>(null);
	const [titleError, setTitleError] = useState<string | null>(null);
	const [formError, setFormError] = useState<string | null>(null);
	const [listError, setListError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);
	const [loading, setLoading] = useState(true);
	const destinationRef = useRef<HTMLInputElement>(null);

	const atQuota = quota.remaining <= 0;

	const loadLinks = useCallback(async () => {
		setLoading(true);
		setListError(null);
		try {
			const snapshot = await listLinks();
			setLinks(snapshot.links);
			setQuota(snapshot.quota);
		} catch (error) {
			setListError(
				error instanceof LinksApiError ? error.message : GENERIC_LOAD_ERROR,
			);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadLinks();
	}, [loadLinks]);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = event.currentTarget;
		const data = new FormData(form);
		const destination = String(data.get("destination") ?? "").trim();
		const title = String(data.get("title") ?? "").trim();

		setTitleError(null);
		setFormError(null);

		if (!isHttpUrl(destination)) {
			setDestinationError(DESTINATION_ERROR);
			destinationRef.current?.focus();
			return;
		}
		setDestinationError(null);
		setPending(true);

		try {
			const result = await createShortLink({
				destination,
				title: title || undefined,
			});
			setLinks((current) => [
				result.link,
				...current.filter((link) => link.code !== result.link.code),
			]);
			setQuota(result.quota);
			setCreatedLink(result.link);
			setListError(null);
			form.reset();
			toast.success("Short link created.");
		} catch (error) {
			if (error instanceof LinksApiError) {
				if (error.field === "destination" || error.code === "INVALID_URL") {
					setDestinationError(error.message);
					destinationRef.current?.focus();
				} else if (error.field === "title" || error.code === "INVALID_TITLE") {
					setTitleError(error.message);
				} else {
					setFormError(error.message);
				}
			} else {
				setFormError(GENERIC_CREATE_ERROR);
			}
		} finally {
			setPending(false);
		}
	}

	async function copyLink(link: ShortLink) {
		try {
			await navigator.clipboard.writeText(link.shortUrl);
			toast.success("Short link copied.");
		} catch {
			toast.info(`Copy this link: ${link.shortUrl}`);
		}
	}

	return (
		<main className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-4 overflow-y-auto px-4 py-6 sm:gap-6 sm:px-6">
			<div className="flex shrink-0 flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="font-semibold text-2xl tracking-tight">Your links</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						Welcome, {session.user.name}. A simple home for everything you
						share.
					</p>
				</div>
				<Badge variant={atQuota ? "destructive" : "secondary"}>
					{quota.used} / {quota.limit} links
				</Badge>
			</div>

			<Card className="min-w-0 shrink-0">
				<CardHeader>
					<CardTitle>Create a short link</CardTitle>
					<CardDescription>
						Paste a long URL and optionally give it a name.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} noValidate>
						<FieldGroup className="gap-3 md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] md:items-start">
							<Field data-invalid={destinationError ? true : undefined}>
								<FieldLabel htmlFor="destination">Destination URL</FieldLabel>
								<InputGroup>
									<InputGroupAddon>
										<Link2 />
									</InputGroupAddon>
									<InputGroupInput
										id="destination"
										ref={destinationRef}
										name="destination"
										type="url"
										inputMode="url"
										placeholder="https://example.com/your-long-link"
										autoComplete="off"
										spellCheck={false}
										required
										aria-invalid={destinationError ? true : undefined}
										aria-describedby={
											destinationError ? "destination-error" : undefined
										}
										onChange={() => setDestinationError(null)}
									/>
								</InputGroup>
								{destinationError ? (
									<FieldError id="destination-error">
										{destinationError}
									</FieldError>
								) : null}
							</Field>
							<Field data-invalid={titleError ? true : undefined}>
								<FieldLabel htmlFor="link-title">
									Link title (optional)
								</FieldLabel>
								<Input
									id="link-title"
									name="title"
									maxLength={120}
									placeholder="Give it a name"
									aria-invalid={titleError ? true : undefined}
									aria-describedby={titleError ? "title-error" : undefined}
									onChange={() => setTitleError(null)}
								/>
								{titleError ? (
									<FieldError id="title-error">{titleError}</FieldError>
								) : null}
							</Field>
							<Button type="submit" disabled={pending || atQuota}>
								{pending ? "Creating…" : "Shorten link"}
								{pending ? null : <ArrowUpRight data-icon="inline-end" />}
							</Button>
						</FieldGroup>
						{formError ? (
							<p role="alert" className="mt-3 text-destructive text-sm">
								{formError}
							</p>
						) : null}
						{atQuota ? (
							<p className="mt-3 text-muted-foreground text-sm">
								This account has reached the {quota.limit}-link limit. It can't
								create more links in this release.
							</p>
						) : null}
					</form>
				</CardContent>
				{createdLink ? (
					<CardFooter className="flex-wrap justify-between gap-3">
						<div className="min-w-0" role="status">
							<p className="font-medium text-sm">Your short link is ready</p>
							<p className="break-all font-mono text-sm">
								{createdLink.shortUrl}
							</p>
						</div>
						<div className="flex gap-2">
							<Button variant="outline" onClick={() => copyLink(createdLink)}>
								<Copy data-icon="inline-start" />
								Copy link
							</Button>
							<Button variant="outline" onClick={() => setQrLink(createdLink)}>
								<QrCode data-icon="inline-start" />
								QR code
							</Button>
						</div>
					</CardFooter>
				) : null}
			</Card>

			<Card className="min-w-0 shrink-0">
				<CardHeader className="gap-4 sm:flex sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-center gap-2">
						<CardTitle>All links</CardTitle>
						<Badge variant="secondary">{quota.used}</Badge>
					</div>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div
							className="grid gap-3"
							role="status"
							aria-label="Loading links"
						>
							<Skeleton className="h-24 w-full rounded-lg" />
							<Skeleton className="h-24 w-full rounded-lg" />
							<Skeleton className="h-24 w-full rounded-lg" />
						</div>
					) : listError ? (
						<div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-4">
							<p role="alert" className="text-sm">
								{listError}
							</p>
							<Button
								variant="outline"
								size="sm"
								onClick={loadLinks}
								disabled={loading}
							>
								<RefreshCw data-icon="inline-start" />
								Try again
							</Button>
						</div>
					) : links.length === 0 ? (
						<Empty>
							<EmptyHeader>
								<EmptyTitle>No links yet</EmptyTitle>
								<EmptyDescription>
									Create your first short link above — it will appear here.
								</EmptyDescription>
							</EmptyHeader>
						</Empty>
					) : (
						<ul className="grid gap-3">
							{links.map((link) => (
								<li
									key={link.code}
									className="flex min-w-0 flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
								>
									<div className="min-w-0">
										<p className="truncate font-medium text-sm">
											{linkTitle(link)}
										</p>
										<Button
											variant="link"
											className="h-auto max-w-full justify-start p-0 font-mono text-xs"
											onClick={() => copyLink(link)}
											aria-label={`Copy short URL for ${linkTitle(link)}`}
										>
											<span className="truncate">{link.shortUrl}</span>
											<Copy data-icon="inline-end" />
										</Button>
										<p className="truncate text-muted-foreground text-xs">
											<a
												href={link.destination}
												target="_blank"
												rel="noreferrer"
												className="hover:text-foreground"
											>
												↗ {hostnameOf(link.destination)}
											</a>
											{" · "}
											<time dateTime={link.createdAt}>
												{formatCreatedAt(link.createdAt)}
											</time>
										</p>
									</div>
									<div className="flex shrink-0 gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => copyLink(link)}
										>
											<Copy data-icon="inline-start" />
											Copy
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => setQrLink(link)}
										>
											<QrCode data-icon="inline-start" />
											QR
										</Button>
									</div>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>

			<Dialog
				open={qrLink !== null}
				onOpenChange={(open) => {
					if (!open) setQrLink(null);
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>QR code</DialogTitle>
						<DialogDescription>
							Scan or download the QR code for this short link.
						</DialogDescription>
					</DialogHeader>
					{qrLink ? <QrDownload link={qrLink} /> : null}
				</DialogContent>
			</Dialog>
		</main>
	);
}
