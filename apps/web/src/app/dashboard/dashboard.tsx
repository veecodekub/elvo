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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ArrowUpRight,
	BarChart3,
	ChevronLeft,
	ChevronRight,
	Copy,
	Link2,
	MoreHorizontal,
	Pencil,
	QrCode,
	RefreshCw,
	Search,
	X,
} from "lucide-react";
import dynamic from "next/dynamic";
import {
	createContext,
	type FormEvent,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";

import type { authClient } from "@/lib/auth-client";
import {
	createShortLink,
	type LinkQuota,
	type LinkStatusFilter,
	LinksApiError,
	type ShortLink,
} from "@/lib/links-api";
import {
	createLinkToggleController,
	type LinkToggleRequest,
	linkKeys,
	linksQueryOptions,
	setQuotaInSnapshots,
	useToggleLinkMutation,
	useUpdateLinkMutation,
} from "@/lib/links-queries";

const DashboardDialogCloseContext = createContext<(() => void) | null>(null);

function FeatureDialogLoading({
	title,
	description,
	loadingLabel,
	className,
}: {
	title: string;
	description: string;
	loadingLabel: string;
	className: string;
}) {
	const onClose = useContext(DashboardDialogCloseContext);
	return (
		<Dialog open onOpenChange={(open) => (!open ? onClose?.() : undefined)}>
			<DialogContent className={className} aria-busy="true">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<div
					className="grid gap-3"
					role="status"
					aria-busy="true"
					aria-label={loadingLabel}
				>
					{title === "Preparing code" ? (
						<Skeleton className="mx-auto h-60 w-60 rounded-lg" />
					) : (
						<>
							<Skeleton className="h-4 w-44" />
							<Skeleton className="h-48 w-full rounded-lg" />
						</>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

function QrCodeDialogLoading() {
	return (
		<FeatureDialogLoading
			title="Preparing code"
			description="The QR code is being prepared."
			loadingLabel="Loading QR code"
			className="sm:max-w-md"
		/>
	);
}

function LinkAnalyticsDialogLoading() {
	return (
		<FeatureDialogLoading
			title="Loading chart"
			description="Click analytics is loading."
			loadingLabel="Loading click analytics"
			className="sm:max-w-lg"
		/>
	);
}

const QrCodeDialog = dynamic(() => import("./qr-code-dialog"), {
	loading: QrCodeDialogLoading,
});

const LinkAnalyticsDialog = dynamic(() => import("./analytics-dialog"), {
	loading: LinkAnalyticsDialogLoading,
});

const DESTINATION_ERROR =
	"Enter a valid HTTP or HTTPS URL, for example https://example.com.";
const GENERIC_CREATE_ERROR =
	"We couldn't create your link. Check your connection and try again.";
const GENERIC_LOAD_ERROR = "We couldn't load your links. Try again.";
const GENERIC_UPDATE_ERROR =
	"We couldn't update this link. Check your connection and try again.";
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
	pending,
}: {
	link: ShortLink;
	onChange: (link: ShortLink, enabled: boolean) => void;
	pending: boolean;
}) {
	const name = linkTitle(link);
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Switch
						checked={link.enabled}
						disabled={pending}
						aria-busy={pending}
						aria-label={
							pending
								? `Updating status for link: ${name}`
								: `${link.enabled ? "Disable" : "Enable"} link: ${name}`
						}
						onCheckedChange={(checked) => onChange(link, checked)}
					/>
				}
			/>
			<TooltipContent>
				{pending
					? "Updating link status…"
					: link.enabled
						? "Disable link"
						: "Enable link"}
			</TooltipContent>
		</Tooltip>
	);
}

export default function Dashboard({
	session,
}: {
	session: typeof authClient.$Infer.Session;
}) {
	const queryClient = useQueryClient();

	const [searchInput, setSearchInput] = useState("");
	const [query, setQuery] = useState("");
	const [status, setStatus] = useState<LinkStatusFilter>("all");
	const [page, setPage] = useState(1);

	const [createdLink, setCreatedLink] = useState<ShortLink | null>(null);
	const [qrLink, setQrLink] = useState<ShortLink | null>(null);
	const [analyticsLink, setAnalyticsLink] = useState<ShortLink | null>(null);
	const [pendingToggleCodes, setPendingToggleCodes] = useState<Set<string>>(
		() => new Set(),
	);
	const [editing, setEditing] = useState<ShortLink | null>(null);
	const [discardOpen, setDiscardOpen] = useState(false);

	const [destinationError, setDestinationError] = useState<string | null>(null);
	const [titleError, setTitleError] = useState<string | null>(null);
	const [formError, setFormError] = useState<string | null>(null);
	const [editError, setEditError] = useState<string | null>(null);

	const destinationRef = useRef<HTMLInputElement>(null);
	const editFormRef = useRef<HTMLFormElement>(null);
	const editDestinationRef = useRef<HTMLInputElement>(null);
	const toggleExecutionRef = useRef<
		(request: LinkToggleRequest) => Promise<void>
	>(async () => {});
	const toggleControllerRef = useRef<ReturnType<
		typeof createLinkToggleController
	> | null>(null);

	const {
		data: linksSnapshot,
		error: linksError,
		isFetching: linksFetching,
		isPending: linksPending,
		refetch: refetchLinks,
	} = useQuery(linksQueryOptions({ page, query, status }));
	const links = linksSnapshot?.links ?? [];
	const quota = linksSnapshot?.quota ?? EMPTY_QUOTA;
	const pageInfo: PageInfo = linksSnapshot
		? {
				page: linksSnapshot.page,
				pageSize: linksSnapshot.pageSize,
				total: linksSnapshot.total,
				totalPages: linksSnapshot.totalPages,
			}
		: INITIAL_PAGE_INFO;
	const listLoading = linksPending || (linksFetching && !linksSnapshot);
	const listError =
		linksError && !linksSnapshot
			? linksError instanceof LinksApiError
				? linksError.message
				: GENERIC_LOAD_ERROR
			: null;

	const createLinkMutation = useMutation({ mutationFn: createShortLink });
	const updateLinkMutation = useUpdateLinkMutation();
	const toggleLinkMutation = useToggleLinkMutation();

	if (toggleControllerRef.current === null) {
		toggleControllerRef.current = createLinkToggleController(
			(request) => toggleExecutionRef.current(request),
			(code, pending) => {
				setPendingToggleCodes((current) => {
					const next = new Set(current);
					if (pending) next.add(code);
					else next.delete(code);
					return next;
				});
			},
		);
	}

	const atQuota = quota.remaining <= 0;
	const filtersActive = query.length > 0 || status !== "all";

	useEffect(() => {
		const timeout = setTimeout(() => {
			setQuery(searchInput.trim());
			setPage(1);
		}, SEARCH_DEBOUNCE_MS);
		return () => clearTimeout(timeout);
	}, [searchInput]);

	useEffect(() => {
		const resolvedPage = linksSnapshot?.page;
		if (resolvedPage && resolvedPage !== page) {
			setPage(resolvedPage);
		}
	}, [linksSnapshot?.page, page]);

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

		try {
			const result = await createLinkMutation.mutateAsync({
				destination,
				title: title || undefined,
			});
			setQuotaInSnapshots(queryClient, result.quota);
			setCreatedLink(result.link);
			setPage(1);
			void queryClient.invalidateQueries({ queryKey: linkKeys.lists() });
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

	async function executeToggle(request: LinkToggleRequest) {
		const { link, enabled } = request;
		try {
			const result = await toggleLinkMutation.mutateAsync({
				code: link.code,
				enabled,
			});
			setCreatedLink((current) =>
				current?.code === result.link.code ? result.link : current,
			);
			const label = enabled ? "enabled" : "disabled";
			if (request.undo) {
				toast.success(`${linkTitle(result.link)} ${label} again.`);
			} else {
				toast.success(`${linkTitle(result.link)} ${label}.`, {
					action: {
						label: "Undo",
						onClick: () => changeEnabled(result.link, link.enabled, true),
					},
				});
			}
			void queryClient.invalidateQueries({ queryKey: linkKeys.lists() });
		} catch (error) {
			toast.error(
				error instanceof LinksApiError ? error.message : GENERIC_UPDATE_ERROR,
			);
		}
	}
	toggleExecutionRef.current = executeToggle;

	function changeEnabled(link: ShortLink, enabled: boolean, isUndo = false) {
		const controller = toggleControllerRef.current;
		if (!controller) return;
		if (!controller.isPending(link.code) && link.enabled === enabled) return;
		controller.request({ link, enabled, undo: isUndo });
	}

	function openAnalytics(link: ShortLink) {
		void queryClient.removeQueries({ queryKey: linkKeys.analytics(link.code) });
		setAnalyticsLink(link);
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
		try {
			const result = await updateLinkMutation.mutateAsync({
				code: editing.code,
				input: {
					destination,
					title: title || null,
				},
			});
			setCreatedLink((current) =>
				current?.code === result.link.code ? result.link : current,
			);
			closeEdit();
			if (filtersActive) {
				void queryClient.invalidateQueries({ queryKey: linkKeys.lists() });
			}
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
		}
	}

	const showEmpty = !listLoading && !listError && pageInfo.total === 0;
	const firstVisible = (pageInfo.page - 1) * pageInfo.pageSize + 1;
	const lastVisible = Math.min(
		pageInfo.page * pageInfo.pageSize,
		pageInfo.total,
	);

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
									<Button
										type="submit"
										disabled={createLinkMutation.isPending || atQuota}
									>
										{createLinkMutation.isPending
											? "Creating…"
											: "Shorten link"}
										{createLinkMutation.isPending ? null : (
											<ArrowUpRight data-icon="inline-end" />
										)}
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
						{listLoading ? (
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
									onClick={() => void refetchLinks()}
								>
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
													<LinkStatus
														link={link}
														onChange={changeEnabled}
														pending={pendingToggleCodes.has(link.code)}
													/>
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
														<LinkStatus
															link={link}
															onChange={changeEnabled}
															pending={pendingToggleCodes.has(link.code)}
														/>
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

				{qrLink ? (
					<DashboardDialogCloseContext.Provider value={() => setQrLink(null)}>
						<QrCodeDialog link={qrLink} onClose={() => setQrLink(null)} />
					</DashboardDialogCloseContext.Provider>
				) : null}

				{analyticsLink ? (
					<DashboardDialogCloseContext.Provider
						value={() => setAnalyticsLink(null)}
					>
						<LinkAnalyticsDialog
							link={analyticsLink}
							onClose={() => setAnalyticsLink(null)}
						/>
					</DashboardDialogCloseContext.Provider>
				) : null}

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
									<Button type="submit" disabled={updateLinkMutation.isPending}>
										{updateLinkMutation.isPending ? "Saving…" : "Save changes"}
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
