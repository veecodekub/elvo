"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@elvo/ui/components/alert-dialog";
import { Badge } from "@elvo/ui/components/badge";
import { Button } from "@elvo/ui/components/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@elvo/ui/components/card";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@elvo/ui/components/chart";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@elvo/ui/components/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@elvo/ui/components/dropdown-menu";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@elvo/ui/components/empty";
import {
	Field,
	FieldDescription,
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
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@elvo/ui/components/select";
import { Skeleton } from "@elvo/ui/components/skeleton";
import { Switch } from "@elvo/ui/components/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@elvo/ui/components/table";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@elvo/ui/components/tooltip";
import {
	ArrowUpRight,
	BarChart3,
	ChevronLeft,
	ChevronRight,
	Copy,
	Download,
	Link2,
	MoreHorizontal,
	Pencil,
	QrCode,
	RefreshCw,
	Search,
	X,
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import {
	type FormEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { toast } from "sonner";

import type { authClient } from "@/lib/auth-client";
import {
	createShortLink,
	getLinkAnalytics,
	type LinkAnalytics,
	type LinkQuota,
	type LinkStatusFilter,
	LinksApiError,
	listLinks,
	type ShortLink,
	updateShortLink,
} from "@/lib/links-api";

const DESTINATION_ERROR =
	"Enter a valid HTTP or HTTPS URL, for example https://example.com.";
const GENERIC_CREATE_ERROR =
	"We couldn't create your link. Check your connection and try again.";
const GENERIC_LOAD_ERROR = "We couldn't load your links. Try again.";
const GENERIC_UPDATE_ERROR =
	"We couldn't update this link. Check your connection and try again.";
const GENERIC_ANALYTICS_ERROR =
	"We couldn't load analytics. Check your connection and try again.";
const QR_DOWNLOAD_ERROR =
	"We couldn't create the QR code PNG. Check your browser and try again.";
const ANALYTICS_POLL_MS = 30_000;
const SEARCH_DEBOUNCE_MS = 250;
const UTC_OFFSET_TIME_ZONE = "Asia/Bangkok";
const EMPTY_QUOTA: LinkQuota = { used: 0, limit: 100, remaining: 100 };

type PageInfo = {
	page: number;
	pageSize: number;
	total: number;
	totalPages: number;
};

const INITIAL_PAGE_INFO: PageInfo = {
	page: 1,
	pageSize: 10,
	total: 0,
	totalPages: 1,
};

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
	return new Intl.DateTimeFormat("en-GB", {
		day: "2-digit",
		hour: "2-digit",
		hour12: false,
		minute: "2-digit",
		month: "short",
		timeZone: UTC_OFFSET_TIME_ZONE,
		year: "numeric",
	}).format(date);
}

function formatCreatedAtShort(value: string) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	return new Intl.DateTimeFormat("en-GB", {
		day: "numeric",
		month: "short",
		timeZone: UTC_OFFSET_TIME_ZONE,
	}).format(date);
}

function formatAnalyticsDay(value: string) {
	const date = new Date(`${value}T00:00:00.000Z`);
	if (Number.isNaN(date.getTime())) return value;
	return new Intl.DateTimeFormat("en-GB", {
		day: "numeric",
		month: "short",
		timeZone: "UTC",
	}).format(date);
}

function formatNumber(value: number) {
	return value.toLocaleString("en-US");
}

function LinkDestination({ destination }: { destination: string }) {
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<a
						href={destination}
						target="_blank"
						rel="noreferrer"
						className="block max-w-full truncate text-muted-foreground text-xs hover:text-foreground"
						aria-label={`Destination: ${destination}`}
					/>
				}
			>
				<span>↗ {hostnameOf(destination)}</span>
			</TooltipTrigger>
			<TooltipContent className="max-w-72 break-all">
				{destination}
			</TooltipContent>
		</Tooltip>
	);
}

function LinkStatus({
	link,
	onChange,
}: {
	link: ShortLink;
	onChange: (link: ShortLink, enabled: boolean) => void;
}) {
	const name = linkTitle(link);
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Switch
						checked={link.enabled}
						aria-label={`${link.enabled ? "Disable" : "Enable"} link: ${name}`}
						onCheckedChange={(checked) => onChange(link, checked)}
					/>
				}
			/>
			<TooltipContent>
				{link.enabled ? "Disable link" : "Enable link"}
			</TooltipContent>
		</Tooltip>
	);
}

function toBlackAndWhitePng(source: HTMLCanvasElement) {
	const output = document.createElement("canvas");
	output.width = source.width;
	output.height = source.height;
	const context = output.getContext("2d", { willReadFrequently: true });
	if (!context) {
		throw new Error("Canvas 2D is unavailable");
	}
	// Flatten any antialiased module edges into pure black or white pixels so the
	// downloaded file is genuinely black-and-white at every device pixel ratio.
	context.fillStyle = "#FFFFFF";
	context.fillRect(0, 0, output.width, output.height);
	context.drawImage(source, 0, 0);
	const image = context.getImageData(0, 0, output.width, output.height);
	const { data } = image;
	for (let index = 0; index < data.length; index += 4) {
		const alpha = data[index + 3] ?? 0;
		const luminance =
			0.2126 * (data[index] ?? 0) +
			0.7152 * (data[index + 1] ?? 0) +
			0.0722 * (data[index + 2] ?? 0);
		const value = alpha >= 128 && luminance < 128 ? 0 : 255;
		data[index] = value;
		data[index + 1] = value;
		data[index + 2] = value;
		data[index + 3] = 255;
	}
	context.putImageData(image, 0, 0);
	return output.toDataURL("image/png");
}

function QrDownload({ link }: { link: ShortLink }) {
	const canvas = useRef<HTMLCanvasElement>(null);
	const [downloadError, setDownloadError] = useState<string | null>(null);

	function download() {
		setDownloadError(null);
		try {
			const current = canvas.current;
			if (!current) {
				throw new Error("QR canvas is not mounted");
			}
			const dataUrl = toBlackAndWhitePng(current);
			if (!dataUrl.startsWith("data:image/png")) {
				throw new Error("QR canvas did not produce a PNG");
			}
			const anchor = document.createElement("a");
			anchor.href = dataUrl;
			anchor.download = `elvo-${link.code}.png`;
			document.body.append(anchor);
			anchor.click();
			anchor.remove();
		} catch {
			setDownloadError(QR_DOWNLOAD_ERROR);
			toast.error(QR_DOWNLOAD_ERROR);
		}
	}

	return (
		<div className="flex flex-col items-center gap-4">
			<QRCodeCanvas
				ref={canvas}
				value={link.shortUrl}
				size={240}
				marginSize={4}
				bgColor="#FFFFFF"
				fgColor="#000000"
				level="M"
				title={`QR code for ${link.shortUrl}`}
				role="img"
				aria-label={`QR code for ${link.shortUrl}`}
			/>
			<code className="break-all text-center text-xs">{link.shortUrl}</code>
			<p className="text-center text-muted-foreground text-sm">
				This QR code opens the short link and keeps working when the destination
				changes.
			</p>
			{downloadError ? (
				<p role="alert" className="text-destructive text-sm">
					{downloadError}
				</p>
			) : null}
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
	const [quota, setQuota] = useState<LinkQuota>(EMPTY_QUOTA);
	const [pageInfo, setPageInfo] = useState<PageInfo>(INITIAL_PAGE_INFO);

	const [searchInput, setSearchInput] = useState("");
	const [query, setQuery] = useState("");
	const [status, setStatus] = useState<LinkStatusFilter>("all");
	const [page, setPage] = useState(1);
	const [refreshToken, setRefreshToken] = useState(0);

	const [createdLink, setCreatedLink] = useState<ShortLink | null>(null);
	const [qrLink, setQrLink] = useState<ShortLink | null>(null);
	const [analyticsLink, setAnalyticsLink] = useState<ShortLink | null>(null);
	const [analytics, setAnalytics] = useState<LinkAnalytics | null>(null);
	const [analyticsLoading, setAnalyticsLoading] = useState(false);
	const [analyticsError, setAnalyticsError] = useState<string | null>(null);
	const [analyticsRefreshToken, setAnalyticsRefreshToken] = useState(0);
	const [editing, setEditing] = useState<ShortLink | null>(null);
	const [discardOpen, setDiscardOpen] = useState(false);

	const [destinationError, setDestinationError] = useState<string | null>(null);
	const [titleError, setTitleError] = useState<string | null>(null);
	const [formError, setFormError] = useState<string | null>(null);
	const [editError, setEditError] = useState<string | null>(null);
	const [listError, setListError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);
	const [editPending, setEditPending] = useState(false);
	const [loading, setLoading] = useState(true);

	const destinationRef = useRef<HTMLInputElement>(null);
	const editFormRef = useRef<HTMLFormElement>(null);
	const editDestinationRef = useRef<HTMLInputElement>(null);

	const atQuota = quota.remaining <= 0;
	const filtersActive = query.length > 0 || status !== "all";

	const refresh = useCallback(() => {
		setRefreshToken((current) => current + 1);
	}, []);

	useEffect(() => {
		const timeout = setTimeout(() => {
			setQuery(searchInput.trim());
			setPage(1);
		}, SEARCH_DEBOUNCE_MS);
		return () => clearTimeout(timeout);
	}, [searchInput]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: refreshToken forces a refetch after a mutation.
	useEffect(() => {
		const controller = new AbortController();
		let cancelled = false;

		setLoading(true);
		setListError(null);

		listLinks({ page, query, signal: controller.signal, status })
			.then((snapshot) => {
				if (cancelled) return;
				setLinks(snapshot.links);
				setQuota(snapshot.quota);
				setPageInfo({
					page: snapshot.page,
					pageSize: snapshot.pageSize,
					total: snapshot.total,
					totalPages: snapshot.totalPages,
				});
				setPage((current) =>
					current === snapshot.page ? current : snapshot.page,
				);
			})
			.catch((error: unknown) => {
				if (
					cancelled ||
					(error instanceof DOMException && error.name === "AbortError")
				) {
					return;
				}
				setListError(
					error instanceof LinksApiError ? error.message : GENERIC_LOAD_ERROR,
				);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
			controller.abort();
		};
	}, [page, query, refreshToken, status]);

	const analyticsCode = analyticsLink?.code ?? null;

	// Fetch immediately on open, then poll while the dialog remains open so new
	// Clicks appear without a manual refresh.
	// biome-ignore lint/correctness/useExhaustiveDependencies: analyticsRefreshToken intentionally restarts the poll after a failed load.
	useEffect(() => {
		if (!analyticsCode) return;
		const code = analyticsCode;

		let cancelled = false;
		let initial = true;
		const controller = new AbortController();

		setAnalyticsLoading(true);
		setAnalyticsError(null);

		async function load() {
			try {
				const snapshot = await getLinkAnalytics(code, {
					signal: controller.signal,
				});
				if (cancelled) return;
				setAnalytics(snapshot);
				setAnalyticsError(null);
				setLinks((current) =>
					current.map((link) =>
						link.code === code
							? { ...link, totalClicks: snapshot.totalClicks }
							: link,
					),
				);
				setCreatedLink((current) =>
					current?.code === code
						? { ...current, totalClicks: snapshot.totalClicks }
						: current,
				);
			} catch (error) {
				if (
					cancelled ||
					(error instanceof DOMException && error.name === "AbortError")
				) {
					return;
				}
				setAnalyticsError(
					error instanceof LinksApiError
						? error.message
						: GENERIC_ANALYTICS_ERROR,
				);
			} finally {
				if (!cancelled && initial) {
					initial = false;
					setAnalyticsLoading(false);
				}
			}
		}

		void load();
		const interval = setInterval(() => {
			void load();
		}, ANALYTICS_POLL_MS);

		return () => {
			cancelled = true;
			controller.abort();
			clearInterval(interval);
		};
	}, [analyticsCode, analyticsRefreshToken]);

	function updateRow(code: string, changes: Partial<ShortLink>) {
		setLinks((current) =>
			current.map((link) =>
				link.code === code ? { ...link, ...changes } : link,
			),
		);
		setCreatedLink((current) =>
			current?.code === code ? { ...current, ...changes } : current,
		);
	}

	function replaceRow(updated: ShortLink) {
		setLinks((current) =>
			current.map((link) => (link.code === updated.code ? updated : link)),
		);
		setCreatedLink((current) =>
			current?.code === updated.code ? updated : current,
		);
	}

	function clearFilters() {
		setSearchInput("");
		setQuery("");
		setStatus("all");
		setPage(1);
	}

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
			setQuota(result.quota);
			setCreatedLink(result.link);
			setListError(null);
			setPage(1);
			refresh();
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

	async function changeEnabled(
		link: ShortLink,
		enabled: boolean,
		isUndo = false,
	) {
		const previous = link.enabled;
		if (previous === enabled) return;

		updateRow(link.code, { enabled });
		try {
			const result = await updateShortLink(link.code, { enabled });
			replaceRow(result.link);
			const label = enabled ? "enabled" : "disabled";
			if (isUndo) {
				toast.success(`${linkTitle(link)} ${label} again.`);
			} else {
				toast.success(`${linkTitle(link)} ${label}.`, {
					action: {
						label: "Undo",
						onClick: () => {
							void changeEnabled({ ...link, enabled }, previous, true);
						},
					},
				});
			}
			if (filtersActive) refresh();
		} catch (error) {
			updateRow(link.code, { enabled: previous });
			toast.error(
				error instanceof LinksApiError ? error.message : GENERIC_UPDATE_ERROR,
			);
		}
	}

	function openAnalytics(link: ShortLink) {
		setAnalytics(null);
		setAnalyticsError(null);
		setAnalyticsLink(link);
	}

	function retryAnalytics() {
		setAnalyticsRefreshToken((current) => current + 1);
	}

	function openEdit(link: ShortLink) {
		setEditError(null);
		setEditing(link);
	}

	function closeEdit() {
		setEditing(null);
		setEditError(null);
		setDiscardOpen(false);
	}

	function requestEditClose() {
		if (editing && editFormRef.current) {
			const data = new FormData(editFormRef.current);
			const title = String(data.get("title") ?? "").trim();
			const destination = String(data.get("destination") ?? "").trim();
			const changed =
				title !== (editing.title ?? "") || destination !== editing.destination;
			if (changed) {
				setDiscardOpen(true);
				return;
			}
		}
		closeEdit();
	}

	async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!editing) return;

		const data = new FormData(event.currentTarget);
		const title = String(data.get("title") ?? "").trim();
		const destination = String(data.get("destination") ?? "").trim();

		if (!isHttpUrl(destination)) {
			setEditError(DESTINATION_ERROR);
			editDestinationRef.current?.focus();
			return;
		}

		setEditError(null);
		setEditPending(true);
		try {
			const result = await updateShortLink(editing.code, {
				destination,
				title: title || null,
			});
			replaceRow(result.link);
			closeEdit();
			if (filtersActive) refresh();
			toast.success("Link updated. The short URL stays the same.");
		} catch (error) {
			if (
				error instanceof LinksApiError &&
				(error.field === "destination" || error.code === "INVALID_URL")
			) {
				setEditError(error.message);
				editDestinationRef.current?.focus();
			} else {
				toast.error(
					error instanceof LinksApiError ? error.message : GENERIC_UPDATE_ERROR,
				);
			}
		} finally {
			setEditPending(false);
		}
	}

	const showEmpty = !loading && !listError && pageInfo.total === 0;
	const firstVisible = (pageInfo.page - 1) * pageInfo.pageSize + 1;
	const lastVisible = Math.min(
		pageInfo.page * pageInfo.pageSize,
		pageInfo.total,
	);
	const analyticsTotal =
		analytics?.totalClicks ?? analyticsLink?.totalClicks ?? 0;
	const analyticsChartData =
		analytics?.days.map((day) => ({
			clicks: day.clicks,
			date: day.date,
			label: formatAnalyticsDay(day.date),
		})) ?? [];
	const analyticsEmpty =
		analytics?.days.every((day) => day.clicks === 0) ?? false;

	return (
		<TooltipProvider>
			<main className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-4 overflow-y-auto px-4 py-6 sm:gap-6 sm:px-6">
				<div className="flex shrink-0 flex-wrap items-end justify-between gap-4">
					<div>
						<h1 className="font-semibold text-2xl tracking-tight">
							Your links
						</h1>
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
								<Field className="md:w-auto">
									<FieldLabel
										aria-hidden="true"
										className="invisible hidden md:flex"
									>
										Shorten
									</FieldLabel>
									<Button type="submit" disabled={pending || atQuota}>
										{pending ? "Creating…" : "Shorten link"}
										{pending ? null : <ArrowUpRight data-icon="inline-end" />}
									</Button>
								</Field>
							</FieldGroup>
							{formError ? (
								<p role="alert" className="mt-3 text-destructive text-sm">
									{formError}
								</p>
							) : null}
							{atQuota ? (
								<p className="mt-3 text-muted-foreground text-sm">
									This account has reached the {quota.limit}-link limit. It
									can't create more links in this release.
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
								<Button
									variant="outline"
									onClick={() => setQrLink(createdLink)}
								>
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
						<div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
							<InputGroup className="sm:w-64">
								<InputGroupAddon>
									<Search />
								</InputGroupAddon>
								<InputGroupInput
									aria-label="Search links by title or URL"
									placeholder="Find a link…"
									maxLength={200}
									value={searchInput}
									onChange={(event) => setSearchInput(event.target.value)}
								/>
								{searchInput ? (
									<InputGroupAddon align="inline-end">
										<Button
											variant="ghost"
											size="icon-sm"
											aria-label="Clear search"
											onClick={() => {
												setSearchInput("");
												setQuery("");
												setPage(1);
											}}
										>
											<X />
										</Button>
									</InputGroupAddon>
								) : null}
							</InputGroup>
							<Select
								value={status}
								onValueChange={(value) => {
									if (value) {
										setStatus(value as LinkStatusFilter);
										setPage(1);
									}
								}}
								items={[
									{ value: "all", label: "All statuses" },
									{ value: "active", label: "Active" },
									{ value: "disabled", label: "Disabled" },
								]}
							>
								<SelectTrigger
									aria-label="Filter by status"
									className="w-full sm:w-36"
								>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectItem value="all">All statuses</SelectItem>
										<SelectItem value="active">Active</SelectItem>
										<SelectItem value="disabled">Disabled</SelectItem>
									</SelectGroup>
								</SelectContent>
							</Select>
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
								<Button variant="outline" size="sm" onClick={() => refresh()}>
									<RefreshCw data-icon="inline-start" />
									Try again
								</Button>
							</div>
						) : showEmpty ? (
							<Empty>
								<EmptyHeader>
									<EmptyTitle>
										{quota.used === 0 ? "No links yet" : "No matching links"}
									</EmptyTitle>
									<EmptyDescription>
										{quota.used === 0
											? "Create your first short link above — it will appear here."
											: "Try another title, URL, or status filter."}
									</EmptyDescription>
								</EmptyHeader>
								{quota.used > 0 ? (
									<EmptyContent>
										<Button variant="outline" onClick={clearFilters}>
											Clear filters
										</Button>
									</EmptyContent>
								) : null}
							</Empty>
						) : (
							<>
								<ul className="grid gap-3 md:hidden">
									{links.map((link) => (
										<li key={link.code}>
											<Card size="sm" className="min-w-0 gap-2">
												<CardHeader>
													<CardTitle className="min-w-0 truncate">
														{linkTitle(link)}
													</CardTitle>
													<CardAction>
														<DropdownMenu>
															<DropdownMenuTrigger
																render={
																	<Button
																		variant="ghost"
																		size="icon"
																		aria-label={`Actions for ${linkTitle(link)}`}
																	/>
																}
															>
																<MoreHorizontal />
															</DropdownMenuTrigger>
															<DropdownMenuContent align="end">
																<DropdownMenuGroup>
																	<DropdownMenuItem
																		onClick={() => copyLink(link)}
																	>
																		<Copy />
																		Copy link
																	</DropdownMenuItem>
																	<DropdownMenuItem
																		onClick={() => setQrLink(link)}
																	>
																		<QrCode />
																		QR code
																	</DropdownMenuItem>
																	<DropdownMenuItem
																		onClick={() => openEdit(link)}
																	>
																		<Pencil />
																		Edit link
																	</DropdownMenuItem>
																	<DropdownMenuItem
																		onClick={() => openAnalytics(link)}
																	>
																		<BarChart3 />
																		Analytics
																	</DropdownMenuItem>
																</DropdownMenuGroup>
															</DropdownMenuContent>
														</DropdownMenu>
													</CardAction>
												</CardHeader>
												<CardContent className="flex min-w-0 flex-col gap-1">
													<Button
														variant="link"
														className="h-auto justify-start p-0"
														onClick={() => copyLink(link)}
														aria-label={`Copy short URL for ${linkTitle(link)}`}
													>
														<span className="truncate font-mono">
															{link.shortUrl}
														</span>
														<Copy data-icon="inline-end" />
													</Button>
													<LinkDestination destination={link.destination} />
													<Tooltip>
														<TooltipTrigger
															render={
																<Button
																	variant="link"
																	className="h-auto w-fit justify-start p-0 text-muted-foreground text-xs"
																	aria-label={`Creation time for ${linkTitle(link)}`}
																/>
															}
														>
															<time dateTime={link.createdAt}>
																Created {formatCreatedAtShort(link.createdAt)}
															</time>
														</TooltipTrigger>
														<TooltipContent>
															{formatCreatedAt(link.createdAt)} (UTC+7)
														</TooltipContent>
													</Tooltip>
												</CardContent>
												<CardFooter className="justify-between gap-2">
													<Button
														variant="ghost"
														size="sm"
														aria-label={`Analytics for ${linkTitle(link)}`}
														onClick={() => openAnalytics(link)}
													>
														<BarChart3 data-icon="inline-start" />
														<span className="tabular-nums">
															{formatNumber(link.totalClicks)} clicks
														</span>
													</Button>
													<LinkStatus link={link} onChange={changeEnabled} />
												</CardFooter>
											</Card>
										</li>
									))}
								</ul>
								<div className="hidden md:block">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Link / destination</TableHead>
												<TableHead>Clicks</TableHead>
												<TableHead>Status</TableHead>
												<TableHead className="hidden lg:table-cell">
													Created (UTC+7)
												</TableHead>
												<TableHead className="text-right">Actions</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{links.map((link) => (
												<TableRow key={link.code}>
													<TableCell>
														<div className="flex w-44 min-w-0 flex-col gap-1 lg:w-72">
															<span className="truncate font-medium">
																{linkTitle(link)}
															</span>
															<button
																type="button"
																className="flex max-w-full items-center gap-2 text-left font-mono text-muted-foreground text-xs hover:text-foreground"
																onClick={() => copyLink(link)}
																aria-label={`Copy short URL for ${linkTitle(link)}`}
															>
																<span className="truncate">
																	{link.shortUrl}
																</span>
																<Copy
																	className="size-3 shrink-0"
																	aria-hidden="true"
																/>
															</button>
															<LinkDestination destination={link.destination} />
														</div>
													</TableCell>
													<TableCell>
														<Button
															variant="ghost"
															size="sm"
															className="-ml-2 tabular-nums"
															aria-label={`Analytics for ${linkTitle(link)}`}
															onClick={() => openAnalytics(link)}
														>
															<BarChart3 data-icon="inline-start" />
															{formatNumber(link.totalClicks)}
														</Button>
													</TableCell>
													<TableCell>
														<LinkStatus link={link} onChange={changeEnabled} />
													</TableCell>
													<TableCell className="hidden lg:table-cell">
														<time
															dateTime={link.createdAt}
															className="whitespace-nowrap text-muted-foreground text-xs"
														>
															{formatCreatedAt(link.createdAt)}
														</time>
													</TableCell>
													<TableCell>
														<div className="flex justify-end gap-1">
															<Tooltip>
																<TooltipTrigger
																	render={
																		<Button
																			variant="ghost"
																			size="icon"
																			aria-label={`Copy ${linkTitle(link)}`}
																			onClick={() => copyLink(link)}
																		/>
																	}
																>
																	<Copy />
																</TooltipTrigger>
																<TooltipContent>Copy link</TooltipContent>
															</Tooltip>
															<Tooltip>
																<TooltipTrigger
																	render={
																		<Button
																			variant="ghost"
																			size="icon"
																			aria-label={`QR for ${linkTitle(link)}`}
																			onClick={() => setQrLink(link)}
																		/>
																	}
																>
																	<QrCode />
																</TooltipTrigger>
																<TooltipContent>QR code</TooltipContent>
															</Tooltip>
															<Tooltip>
																<TooltipTrigger
																	render={
																		<Button
																			variant="ghost"
																			size="icon"
																			aria-label={`Analytics for ${linkTitle(link)}`}
																			onClick={() => openAnalytics(link)}
																		/>
																	}
																>
																	<BarChart3 />
																</TooltipTrigger>
																<TooltipContent>Analytics</TooltipContent>
															</Tooltip>
															<Tooltip>
																<TooltipTrigger
																	render={
																		<Button
																			variant="ghost"
																			size="icon"
																			aria-label={`Edit ${linkTitle(link)}`}
																			onClick={() => openEdit(link)}
																		/>
																	}
																>
																	<Pencil />
																</TooltipTrigger>
																<TooltipContent>Edit link</TooltipContent>
															</Tooltip>
														</div>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							</>
						)}
					</CardContent>
					<CardFooter className="flex-wrap justify-between gap-3">
						<span className="text-muted-foreground text-xs" role="status">
							{pageInfo.total === 0 ? "0" : `${firstVisible}–${lastVisible}`} of{" "}
							{pageInfo.total} links
						</span>
						<nav
							aria-label="Link pagination"
							className="flex shrink-0 items-center gap-2"
						>
							<Button
								variant="outline"
								size="icon-sm"
								aria-label="Previous page"
								disabled={pageInfo.page <= 1}
								onClick={() => setPage((current) => Math.max(1, current - 1))}
							>
								<ChevronLeft />
							</Button>
							<span className="min-w-10 text-center text-muted-foreground text-xs tabular-nums">
								<span aria-hidden="true">
									{pageInfo.page}/{pageInfo.totalPages}
								</span>
								<span className="sr-only">
									Page {pageInfo.page} of {pageInfo.totalPages}
								</span>
							</span>
							<Button
								variant="outline"
								size="icon-sm"
								aria-label="Next page"
								disabled={pageInfo.page >= pageInfo.totalPages}
								onClick={() =>
									setPage((current) =>
										Math.min(pageInfo.totalPages, current + 1),
									)
								}
							>
								<ChevronRight />
							</Button>
						</nav>
					</CardFooter>
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

				<Dialog
					open={analyticsLink !== null}
					onOpenChange={(open) => {
						if (!open) setAnalyticsLink(null);
					}}
				>
					<DialogContent className="sm:max-w-lg">
						<DialogHeader>
							<DialogTitle>Click analytics</DialogTitle>
							<DialogDescription>
								{analyticsLink ? linkTitle(analyticsLink) : null}
							</DialogDescription>
						</DialogHeader>
						{analyticsLink ? (
							<div className="flex flex-col gap-4">
								<div className="rounded-lg border bg-muted/30 px-4 py-3">
									<p className="text-muted-foreground text-sm">Total Clicks</p>
									<p
										className="font-semibold text-3xl tabular-nums"
										data-testid="analytics-total"
										aria-live="polite"
									>
										{analyticsLoading && !analytics
											? "…"
											: formatNumber(analyticsTotal)}
									</p>
									<p className="text-muted-foreground text-xs">
										Lifetime successful redirects.
									</p>
								</div>

								{analyticsError ? (
									<div className="flex flex-col items-start gap-2 rounded-lg border border-destructive/40 p-3">
										<p role="alert" className="text-destructive text-sm">
											{analyticsError}
										</p>
										<Button
											variant="outline"
											size="sm"
											onClick={retryAnalytics}
										>
											<RefreshCw data-icon="inline-start" />
											Try again
										</Button>
									</div>
								) : null}

								{analyticsLoading && !analytics ? (
									<div
										className="grid gap-3"
										role="status"
										aria-label="Loading analytics"
									>
										<Skeleton className="h-4 w-44" />
										<Skeleton className="h-48 w-full rounded-lg" />
									</div>
								) : analytics ? (
									<div className="flex flex-col gap-3">
										<div>
											<p className="font-medium text-sm">
												Last 30 UTC calendar days
											</p>
											<p className="text-muted-foreground text-xs">
												{analytics.range.start} to {analytics.range.end}
											</p>
										</div>
										<ChartContainer
											config={{
												clicks: {
													color: "var(--foreground)",
													label: "Clicks",
												},
											}}
											className="h-48 w-full"
											role="group"
											aria-label="Daily clicks for the last 30 UTC calendar days"
										>
											<BarChart accessibilityLayer data={analyticsChartData}>
												<CartesianGrid vertical={false} />
												<XAxis
													dataKey="label"
													tickLine={false}
													axisLine={false}
													tickMargin={8}
													minTickGap={24}
												/>
												<ChartTooltip
													cursor={false}
													content={
														<ChartTooltipContent
															labelFormatter={(value) =>
																`${String(value)} · UTC`
															}
														/>
													}
												/>
												<Bar
													dataKey="clicks"
													fill="var(--color-clicks)"
													radius={[3, 3, 0, 0]}
												/>
											</BarChart>
										</ChartContainer>
										{analyticsEmpty ? (
											<p className="text-muted-foreground text-sm">
												{analytics.totalClicks === 0
													? "No clicks recorded yet. Share the short link to start collecting analytics."
													: "No clicks in the last 30 UTC days. The lifetime total above is kept."}
											</p>
										) : null}
										<p className="text-muted-foreground text-xs">
											Repeat openings and bots are counted. Destination loads
											and unique visitors are not tracked. Updates automatically
											every 30 seconds.
										</p>
									</div>
								) : null}
							</div>
						) : null}
					</DialogContent>
				</Dialog>

				<Dialog
					open={editing !== null}
					onOpenChange={(open) => {
						if (!open) requestEditClose();
					}}
				>
					<DialogContent className="sm:max-w-md">
						<DialogHeader>
							<DialogTitle>Edit link</DialogTitle>
							<DialogDescription>
								{editing ? linkTitle(editing) : null}
							</DialogDescription>
						</DialogHeader>
						{editing ? (
							<form
								key={editing.code}
								ref={editFormRef}
								onSubmit={handleEditSubmit}
								noValidate
							>
								<FieldGroup>
									<Field>
										<FieldLabel htmlFor="edit-title">Link title</FieldLabel>
										<Input
											id="edit-title"
											name="title"
											defaultValue={editing.title ?? ""}
											maxLength={120}
											placeholder="Give it a name"
										/>
									</Field>
									<Field data-invalid={editError ? true : undefined}>
										<FieldLabel htmlFor="edit-url">Destination URL</FieldLabel>
										<Input
											id="edit-url"
											ref={editDestinationRef}
											aria-invalid={editError ? true : undefined}
											aria-describedby={
												editError ? "edit-url-error" : undefined
											}
											spellCheck={false}
											autoComplete="off"
											name="destination"
											type="url"
											required
											defaultValue={editing.destination}
											onChange={() => setEditError(null)}
										/>
										<FieldDescription>
											The short URL and Link Code stay the same.
										</FieldDescription>
										{editError ? (
											<FieldError id="edit-url-error">{editError}</FieldError>
										) : null}
									</Field>
									<Button type="submit" disabled={editPending}>
										{editPending ? "Saving…" : "Save changes"}
									</Button>
								</FieldGroup>
							</form>
						) : null}
					</DialogContent>
				</Dialog>

				<AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Discard changes?</AlertDialogTitle>
							<AlertDialogDescription>
								This link has unsaved changes. Keep editing to save them, or
								discard them to close.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Keep editing</AlertDialogCancel>
							<AlertDialogAction
								onClick={() => {
									setDiscardOpen(false);
									closeEdit();
								}}
							>
								Discard changes
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</main>
		</TooltipProvider>
	);
}
