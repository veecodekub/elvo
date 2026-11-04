"use client";

// Workspace redesign prototype. All demo changes are held in memory.
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
	DropdownMenuLabel,
	DropdownMenuSeparator,
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
import { Separator } from "@elvo/ui/components/separator";
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
	CalendarDays,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Copy,
	Download,
	ExternalLink,
	Link2,
	LogOut,
	Moon,
	MoreHorizontal,
	Pencil,
	QrCode,
	Search as SearchIcon,
	Sun,
	UserRound,
} from "lucide-react";
import { useTheme } from "next-themes";
import { QRCodeCanvas } from "qrcode.react";
import { type FormEvent, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { toast } from "sonner";

type DemoLink = {
	code: string;
	title: string;
	destination: string;
	clicks: number;
	active: boolean;
	createdAt: string;
};
const initialLinks: DemoLink[] = [
	{
		code: "a8K2mQ",
		createdAt: "2026-10-19T07:30:00Z",
		title: "The next big thing",
		destination: "https://example.com/launch",
		clicks: 1248,
		active: true,
	},
	{
		code: "f3R7xB",
		createdAt: "2026-10-17T03:15:00Z",
		title: "My little corner of the internet",
		destination: "https://example.com/portfolio",
		clicks: 826,
		active: true,
	},
	{
		code: "n9P4vL",
		createdAt: "2026-10-15T11:45:00Z",
		title: "Good reads, delivered",
		destination: "https://example.com/newsletter",
		clicks: 364,
		active: true,
	},
	{
		code: "k2W6sD",
		createdAt: "2026-10-12T02:10:00Z",
		title: "Something worth sharing",
		destination: "https://example.com/collection",
		clicks: 1628,
		active: false,
	},
];

const activity = [
	18, 26, 20, 38, 31, 22, 44, 36, 25, 42, 58, 39, 31, 48, 61, 42, 51, 38, 57,
	72, 63, 48, 66, 57, 81, 70, 62, 85, 73, 95,
].map((clicks, index) => ({
	day: new Date(Date.UTC(2026, 8, 20 + index)).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	}),
	clicks,
}));
const formatCreatedAt = (value: string) =>
	new Date(value).toLocaleString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
		timeZone: "Asia/Bangkok",
	});
const formatNumber = (value: number) => value.toLocaleString("en-US");

function QrDownload({ code }: { code: string }) {
	const canvas = useRef<HTMLCanvasElement>(null);
	function download() {
		if (!canvas.current) return;
		const link = document.createElement("a");
		link.href = canvas.current.toDataURL("image/png");
		link.download = `elvo-${code}.png`;
		document.body.append(link);
		link.click();
		link.remove();
	}
	return (
		<div className="flex flex-col items-center gap-4">
			<QRCodeCanvas
				ref={canvas}
				value={`https://elvo.example/${code}`}
				size={240}
				marginSize={4}
				title={`QR code for elvo.example/${code}`}
				role="img"
				aria-label={`QR code for elvo.example/${code}`}
			/>
			<code className="text-xs">elvo.example/{code}</code>
			<p className="text-muted-foreground text-sm">
				This QR encodes the sample short URL. Demo links do not redirect.
			</p>
			<Button onClick={download}>
				<Download data-icon="inline-start" />
				Download PNG
			</Button>
		</div>
	);
}

function LinkDestination({ destination }: { destination: string }) {
	const url = new URL(destination);
	const destinationLabel = `${url.hostname}${url.pathname === "/" ? "" : url.pathname}`;

	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<a
						href={destination}
						target="_blank"
						rel="noreferrer"
						className="block max-w-full text-muted-foreground text-xs hover:text-foreground"
						aria-label={`Destination: ${destination}`}
					/>
				}
			>
				<span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
					<ExternalLink
						className="size-3 shrink-0 text-muted-foreground"
						aria-hidden="true"
					/>
					<span className="truncate">{destinationLabel}</span>
				</span>
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
	link: DemoLink;
	onChange: (link: DemoLink, checked: boolean) => void;
}) {
	return (
		<div className="inline-flex items-center gap-2">
			<span className="whitespace-nowrap text-muted-foreground text-xs">
				{link.active ? "Active" : "Disabled"}
			</span>
			<Tooltip>
				<TooltipTrigger
					render={
						<Switch
							checked={link.active}
							aria-label={`${link.active ? "Disable" : "Enable"} ${link.title}`}
							onCheckedChange={(checked) => onChange(link, checked)}
						/>
					}
				/>
				<TooltipContent>
					{link.active ? "Disable link" : "Enable link"}
				</TooltipContent>
			</Tooltip>
		</div>
	);
}

export default function DashboardPrototype() {
	const [links, setLinks] = useState(initialLinks);
	const [query, setQuery] = useState("");
	const [status, setStatus] = useState("all");
	const [sortBy, setSortBy] = useState<"newest" | "clicks">("newest");
	const [page, setPage] = useState(1);
	const [discardOpen, setDiscardOpen] = useState(false);
	const editFormRef = useRef<HTMLFormElement>(null);
	const [createdCode, setCreatedCode] = useState<string | null>(null);
	const [createError, setCreateError] = useState("");
	const [editError, setEditError] = useState("");
	const destinationRef = useRef<HTMLInputElement>(null);
	const editDestinationRef = useRef<HTMLInputElement>(null);
	const [accountOpen, setAccountOpen] = useState(false);
	const [panel, setPanel] = useState<{
		kind: "analytics" | "qr" | "edit";
		code: string;
	} | null>(null);
	const { resolvedTheme, setTheme } = useTheme();
	const selected = links.find((link) => link.code === panel?.code);
	const activeLinks = links.filter((link) => link.active).length;
	const totalClicks = links.reduce((sum, link) => sum + link.clicks, 0);
	const visible = links
		.filter(
			(link) =>
				(status === "all" ||
					(status === "active" ? link.active : !link.active)) &&
				`${link.title} ${link.destination} ${link.code}`
					.toLowerCase()
					.includes(query.toLowerCase()),
		)
		.sort((a, b) =>
			sortBy === "clicks"
				? b.clicks - a.clicks
				: Date.parse(b.createdAt) - Date.parse(a.createdAt),
		);

	const pageCount = Math.max(1, Math.ceil(visible.length / 10));
	const currentPage = Math.min(page, pageCount);
	const pageLinks = visible.slice((currentPage - 1) * 10, currentPage * 10);
	const createdLink = links.find((link) => link.code === createdCode);
	function clearFilters() {
		setQuery("");
		setStatus("all");
		setPage(1);
	}

	function changeStatus(link: DemoLink, checked: boolean) {
		setLinks((current) =>
			current.map((item) =>
				item.code === link.code ? { ...item, active: checked } : item,
			),
		);
		toast.success(`${link.title} ${checked ? "enabled" : "disabled"}.`, {
			id: `status-${link.code}`,
			action: {
				label: "Undo",
				onClick: () => {
					setLinks((current) =>
						current.map((item) =>
							item.code === link.code ? { ...item, active: link.active } : item,
						),
					);
				},
			},
		});
	}

	function readDestination(value: FormDataEntryValue | null) {
		try {
			const url = new URL(String(value));
			if (["https:", "http:"].includes(url.protocol)) return url;
		} catch {
			/* Native validation handles malformed URLs; this also guards programmatic submission. */
		}

		return null;
	}
	function createLink(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = event.currentTarget;
		const data = new FormData(form);
		const url = readDestination(data.get("destination"));
		if (!url) {
			setCreateError(
				"Enter a valid HTTP or HTTPS URL, for example https://example.com.",
			);
			destinationRef.current?.focus();
			return;
		}
		if (links.length >= 100) return;
		setCreateError("");
		const code = crypto.randomUUID().replaceAll("-", "").slice(0, 6);
		setCreatedCode(code);
		setPage(1);
		setLinks((current) => [
			{
				code,
				createdAt: new Date().toISOString(),
				title: String(data.get("title") || url.hostname),
				destination: String(data.get("destination")),
				clicks: 0,
				active: true,
			},
			...current,
		]);
		toast.success("Demo link created. Changes reset on reload.");
		form.reset();
	}
	async function copy(code: string) {
		try {
			await navigator.clipboard.writeText(`https://elvo.example/${code}`);
			toast.success("Sample link copied. Demo URLs do not redirect.");
		} catch {
			toast.info(`Sample link: https://elvo.example/${code}`);
		}
	}
	function editLink(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const data = new FormData(event.currentTarget);
		if (!selected) return;
		if (!readDestination(data.get("destination"))) {
			setEditError(
				"Enter a valid HTTP or HTTPS URL, for example https://example.com.",
			);
			editDestinationRef.current?.focus();
			return;
		}
		setEditError("");
		setLinks((current) =>
			current.map((link) =>
				link.code === selected.code
					? {
							...link,
							title: String(data.get("title")),
							destination: String(data.get("destination")),
						}
					: link,
			),
		);
		setPanel(null);
		toast.success("Demo link updated. The short URL stays the same.");
	}

	return (
		<TooltipProvider>
			<div className="min-h-svh min-w-0 bg-muted/30 text-foreground">
				<div className="border-b bg-muted/40 px-4 py-2 text-muted-foreground text-xs">
					<div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
						<Badge variant="outline" className="h-5 bg-background px-2">
							Preview
						</Badge>
						<span>Sample links · changes reset when you reload</span>
					</div>
				</div>
				<header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
					<div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
						<div className="flex items-center gap-3">
							<div
								className="grid size-9 place-items-center rounded-md bg-primary font-semibold text-primary-foreground"
								aria-hidden="true"
							>
								e
							</div>
							<div className="flex items-baseline gap-2">
								<span className="font-semibold text-lg tracking-tight">
									elvo
								</span>
								<span className="text-muted-foreground text-sm">Links</span>
							</div>
							<Separator
								orientation="vertical"
								className="mx-2 hidden h-5 data-vertical:self-center sm:block"
							/>
							<span className="hidden text-muted-foreground text-sm sm:inline">
								Workspace
							</span>
						</div>
						<div className="flex items-center gap-3">
							<Tooltip>
								<TooltipTrigger
									render={
										<Button
											variant="ghost"
											size="icon"
											aria-label="Toggle color theme"
											onClick={() =>
												setTheme(resolvedTheme === "dark" ? "light" : "dark")
											}
										/>
									}
								>
									<Sun className="hidden dark:block" />
									<Moon className="dark:hidden" />
								</TooltipTrigger>
								<TooltipContent>Toggle theme</TooltipContent>
							</Tooltip>
							<DropdownMenu>
								<DropdownMenuTrigger
									render={<Button variant="ghost" aria-label="User menu" />}
								>
									<UserRound data-icon="inline-start" />
									<span className="hidden sm:inline">Personal space</span>
									<ChevronDown data-icon="inline-end" />
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="w-56">
									<DropdownMenuGroup>
										<DropdownMenuLabel>VK · Personal account</DropdownMenuLabel>
										<DropdownMenuItem onClick={() => setAccountOpen(true)}>
											<UserRound />
											Account
										</DropdownMenuItem>
									</DropdownMenuGroup>
									<DropdownMenuSeparator />
									<DropdownMenuGroup>
										<DropdownMenuItem
											onClick={() =>
												toast.info(
													"Prototype only — there is no signed-in session to end.",
												)
											}
										>
											<LogOut />
											Sign out
										</DropdownMenuItem>
									</DropdownMenuGroup>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>
				</header>
				<main className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-5 px-4 py-5 sm:gap-6 sm:px-6 lg:px-8">
					<div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
						<div className="min-w-0">
							<p className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-[0.12em]">
								Workspace / Links
							</p>
							<h1 className="font-semibold text-3xl tracking-tight sm:text-4xl">
								Your links
							</h1>
							<p className="mt-2 max-w-xl text-muted-foreground text-sm sm:text-base">
								Create, manage, and track your short links.
							</p>
						</div>
						<div className="grid w-full max-w-lg grid-cols-2 divide-x rounded-xl border bg-card shadow-sm sm:w-[28rem]">
							<div className="px-4 py-3">
								<p className="text-muted-foreground text-xs">Total clicks</p>
								<p className="mt-1 font-semibold text-xl tabular-nums">
									{formatNumber(totalClicks)}
								</p>
								<p className="mt-1 text-muted-foreground text-xs">
									Across all links
								</p>
							</div>
							<div className="min-w-0 px-4 py-3">
								<div className="flex items-center justify-between gap-2">
									<p className="font-medium text-sm">Usage</p>
									<p className="font-medium text-sm tabular-nums">
										{links.length}{" "}
										<span className="text-muted-foreground">/ 100</span>
									</p>
								</div>
								<div
									className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
									role="progressbar"
									aria-label="Links used"
									aria-valuemin={0}
									aria-valuemax={100}
									aria-valuenow={Math.min(links.length, 100)}
								>
									<div
										className="h-full rounded-full bg-primary transition-[width] duration-300"
										style={{ width: `${Math.min(links.length, 100)}%` }}
									/>
								</div>
								<p className="mt-2 text-muted-foreground text-xs leading-snug">
									{activeLinks} active · {Math.max(0, 100 - links.length)}{" "}
									remaining
								</p>
							</div>
						</div>
					</div>
					<Card className="min-w-0 overflow-hidden rounded-2xl border border-border/70 shadow-sm">
						<CardHeader className="border-b bg-muted/20 sm:flex sm:flex-row sm:items-center sm:justify-between">
							<div className="min-w-0">
								<CardTitle>Create a short link</CardTitle>
								<p className="mt-1 text-muted-foreground text-sm">
									Paste a destination and share a cleaner URL in seconds.
								</p>
							</div>
						</CardHeader>
						<CardContent className="p-4 sm:p-5">
							<form onSubmit={createLink} noValidate>
								<FieldGroup className="gap-4 md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] md:items-end">
									<Field data-invalid={!!createError}>
										<FieldLabel htmlFor="destination">
											Destination URL
										</FieldLabel>
										<InputGroup>
											<InputGroupAddon>
												<Link2 aria-hidden="true" />
											</InputGroupAddon>
											<InputGroupInput
												id="destination"
												ref={destinationRef}
												aria-invalid={!!createError}
												aria-describedby={
													createError ? "destination-error" : undefined
												}
												spellCheck={false}
												autoComplete="off"
												onChange={() => setCreateError("")}
												name="destination"
												type="url"
												placeholder="https://example.com/your-long-link"
												required
											/>
										</InputGroup>
										{createError ? (
											<FieldError id="destination-error">
												{createError}
											</FieldError>
										) : null}
									</Field>
									<Field>
										<FieldLabel htmlFor="link-title">
											Link title (optional)
										</FieldLabel>
										<Input
											id="link-title"
											name="title"
											placeholder="Give it a name"
											maxLength={120}
										/>
									</Field>
									<Button
										type="submit"
										className="h-10 w-full md:w-auto"
										disabled={links.length >= 100}
									>
										Shorten link
										<ArrowUpRight data-icon="inline-end" />
									</Button>
								</FieldGroup>
							</form>
						</CardContent>
						{createdLink ? (
							<CardFooter className="flex-wrap justify-between gap-3">
								<div className="min-w-0" role="status">
									<p className="font-medium text-sm">
										Your short link is ready
									</p>
									<p className="break-all font-mono text-sm">
										elvo.example/{createdLink.code}
									</p>
								</div>
								<div className="flex gap-2">
									<Button
										variant="outline"
										onClick={() => copy(createdLink.code)}
									>
										<Copy data-icon="inline-start" />
										Copy link
									</Button>
									<Button
										variant="outline"
										onClick={() =>
											setPanel({ kind: "qr", code: createdLink.code })
										}
									>
										<QrCode data-icon="inline-start" />
										QR code
									</Button>
								</div>
							</CardFooter>
						) : null}
					</Card>
					<Card className="min-w-0 overflow-hidden rounded-2xl border border-border/70 shadow-sm">
						<CardHeader className="gap-4 border-b bg-card sm:flex sm:flex-col sm:items-stretch lg:flex-row lg:items-center lg:justify-between">
							<div className="min-w-0">
								<div className="flex items-center gap-2">
									<CardTitle>All links</CardTitle>
									<Badge variant="secondary" className="tabular-nums">
										{visible.length}
									</Badge>
								</div>
								<p className="mt-1 text-muted-foreground text-sm">
									Search and manage your short links.
								</p>
							</div>
							<div className="grid w-full gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_9rem] lg:w-[34rem]">
								<InputGroup>
									<InputGroupAddon>
										<SearchIcon />
									</InputGroupAddon>
									<InputGroupInput
										aria-label="Search links"
										placeholder="Find a link…"
										value={query}
										onChange={(event) => {
											setQuery(event.target.value);
											setPage(1);
										}}
									/>
								</InputGroup>
								<Select
									value={status}
									onValueChange={(value) => {
										if (value) {
											setStatus(value);
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
										className="w-full"
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
								<Select
									value={sortBy}
									onValueChange={(value) => {
										if (value === "newest" || value === "clicks") {
											setSortBy(value);
											setPage(1);
										}
									}}
									items={[
										{ value: "newest", label: "Newest" },
										{ value: "clicks", label: "Most clicks" },
									]}
								>
									<SelectTrigger aria-label="Sort links" className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											<SelectItem value="newest">Newest</SelectItem>
											<SelectItem value="clicks">Most clicks</SelectItem>
										</SelectGroup>
									</SelectContent>
								</Select>
							</div>
						</CardHeader>
						<CardContent>
							<div className="grid gap-3 md:hidden">
								{pageLinks.map((link) => (
									<Card
										key={link.code}
										size="sm"
										className="min-w-0 gap-2 shadow-none"
									>
										<CardHeader>
											<CardTitle className="min-w-0 truncate">
												{link.title}
											</CardTitle>
											<CardAction>
												<DropdownMenu>
													<DropdownMenuTrigger
														render={
															<Button
																variant="ghost"
																size="icon"
																aria-label={`Actions for ${link.title}`}
															/>
														}
													>
														<MoreHorizontal />
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														<DropdownMenuGroup>
															<DropdownMenuItem onClick={() => copy(link.code)}>
																<Copy />
																Copy link
															</DropdownMenuItem>
															<DropdownMenuItem
																onClick={() =>
																	setPanel({ kind: "qr", code: link.code })
																}
															>
																<QrCode />
																QR code
															</DropdownMenuItem>
															<DropdownMenuItem
																onClick={() =>
																	setPanel({ kind: "edit", code: link.code })
																}
															>
																<Pencil />
																Edit link
															</DropdownMenuItem>
															<DropdownMenuItem
																onClick={() =>
																	setPanel({
																		kind: "analytics",
																		code: link.code,
																	})
																}
															>
																<BarChart3 />
																Analytics
															</DropdownMenuItem>
														</DropdownMenuGroup>
													</DropdownMenuContent>
												</DropdownMenu>
											</CardAction>
										</CardHeader>
										<CardContent className="flex min-w-0 flex-col gap-3">
											<div className="grid min-w-0 gap-1.5">
												<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
													Short URL
												</p>
												<Button
													variant="outline"
													size="sm"
													className="h-9 w-full justify-between gap-2 px-3 font-normal"
													onClick={() => copy(link.code)}
													aria-label={`Copy short URL for ${link.title}`}
												>
													<span className="min-w-0 truncate font-mono text-foreground text-xs">
														elvo.example/{link.code}
													</span>
													<span className="inline-flex shrink-0 items-center gap-1 text-muted-foreground text-xs">
														<Copy className="size-3.5" aria-hidden="true" />
														<span>Copy</span>
													</span>
												</Button>
											</div>
											<div className="grid min-w-0 gap-1.5">
												<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
													Destination
												</p>
												<LinkDestination destination={link.destination} />
											</div>
										</CardContent>
										<CardFooter className="flex-wrap justify-between gap-2">
											<div className="flex min-w-0 flex-wrap items-center gap-x-1">
												<Button
													variant="ghost"
													size="sm"
													className="h-8 gap-1 px-1"
													aria-label={`Analytics for ${link.title}`}
													onClick={() =>
														setPanel({ kind: "analytics", code: link.code })
													}
												>
													<BarChart3 data-icon="inline-start" />
													<span className="tabular-nums">
														{formatNumber(link.clicks)} clicks
													</span>
												</Button>
												<Tooltip>
													<TooltipTrigger
														render={
															<span className="inline-flex items-center gap-1 whitespace-nowrap text-muted-foreground text-xs" />
														}
													>
														<CalendarDays
															className="size-3.5"
															aria-hidden="true"
														/>
														<time dateTime={link.createdAt}>
															{new Date(link.createdAt).toLocaleDateString(
																"en-GB",
																{
																	day: "numeric",
																	month: "short",
																	timeZone: "Asia/Bangkok",
																},
															)}
														</time>
													</TooltipTrigger>
													<TooltipContent>
														{formatCreatedAt(link.createdAt)} (UTC+7)
													</TooltipContent>
												</Tooltip>
											</div>
											<LinkStatus link={link} onChange={changeStatus} />
										</CardFooter>
									</Card>
								))}
							</div>
							<div className="hidden md:block">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Link</TableHead>
											<TableHead>Clicks</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Created (UTC+7)</TableHead>
											<TableHead className="text-right">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{pageLinks.map((link) => (
											<TableRow key={link.code}>
												<TableCell>
													<div className="flex w-44 min-w-0 flex-col gap-1.5 lg:w-80">
														<span className="truncate font-medium">
															{link.title}
														</span>
														<div className="flex min-w-0 items-center gap-2">
															<span className="w-20 shrink-0 font-medium text-muted-foreground text-xs">
																Short URL
															</span>
															<button
																type="button"
																className="flex min-w-0 items-center gap-1.5 text-left font-mono text-foreground text-xs hover:text-primary"
																onClick={() => copy(link.code)}
																aria-label={`Copy short URL for ${link.title}`}
															>
																<span className="truncate">
																	elvo.example/{link.code}
																</span>
																<Copy
																	className="size-3 shrink-0"
																	aria-hidden="true"
																/>
															</button>
														</div>
														<div className="flex min-w-0 items-center gap-2">
															<span className="w-20 shrink-0 font-medium text-muted-foreground text-xs">
																Destination
															</span>
															<LinkDestination destination={link.destination} />
														</div>
													</div>
												</TableCell>
												<TableCell>
													<Button
														variant="ghost"
														size="sm"
														onClick={() =>
															setPanel({ kind: "analytics", code: link.code })
														}
														aria-label={`Analytics for ${link.title}`}
													>
														<BarChart3 data-icon="inline-start" />
														{formatNumber(link.clicks)}
													</Button>
												</TableCell>
												<TableCell>
													<LinkStatus link={link} onChange={changeStatus} />
												</TableCell>
												<TableCell>
													<time
														dateTime={link.createdAt}
														className="whitespace-nowrap text-muted-foreground text-xs"
													>
														{formatCreatedAt(link.createdAt)}
													</time>
												</TableCell>
												<TableCell>
													<div className="flex justify-end gap-1">
														<Button
															variant="ghost"
															size="sm"
															className="h-8 gap-2 px-2"
															aria-label={`Copy ${link.title}`}
															onClick={() => copy(link.code)}
														>
															<Copy data-icon="inline-start" />
															Copy
														</Button>
														<DropdownMenu>
															<DropdownMenuTrigger
																render={
																	<Button
																		variant="ghost"
																		size="icon"
																		aria-label={`More actions for ${link.title}`}
																	/>
																}
															>
																<MoreHorizontal />
															</DropdownMenuTrigger>
															<DropdownMenuContent align="end">
																<DropdownMenuGroup>
																	<DropdownMenuItem
																		onClick={() =>
																			setPanel({ kind: "qr", code: link.code })
																		}
																	>
																		<QrCode />
																		QR code
																	</DropdownMenuItem>
																	<DropdownMenuItem
																		onClick={() =>
																			setPanel({
																				kind: "edit",
																				code: link.code,
																			})
																		}
																	>
																		<Pencil />
																		Edit link
																	</DropdownMenuItem>
																</DropdownMenuGroup>
															</DropdownMenuContent>
														</DropdownMenu>
													</div>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
							{visible.length === 0 ? (
								<Empty>
									<EmptyHeader>
										<EmptyTitle>
											{links.length === 0
												? "No links yet"
												: "No matching links"}
										</EmptyTitle>
										<EmptyDescription>
											{links.length === 0
												? "Create your first short link using the form above."
												: "Try another title, URL, or status filter."}
										</EmptyDescription>
									</EmptyHeader>
									{links.length > 0 ? (
										<EmptyContent>
											<Button variant="outline" onClick={clearFilters}>
												Clear filters
											</Button>
										</EmptyContent>
									) : null}
								</Empty>
							) : null}
						</CardContent>
						<CardFooter className="flex-wrap justify-between gap-3 border-t bg-muted/10">
							<span className="text-muted-foreground text-xs" role="status">
								{visible.length === 0
									? "0"
									: `${(currentPage - 1) * 10 + 1}–${Math.min(currentPage * 10, visible.length)}`}{" "}
								of {visible.length} links
							</span>
							<nav
								aria-label="Link pagination"
								className="flex shrink-0 items-center gap-2"
							>
								<Button
									variant="outline"
									size="icon-sm"
									aria-label="Previous page"
									disabled={currentPage <= 1}
									onClick={() => setPage(currentPage - 1)}
								>
									<ChevronLeft />
								</Button>
								<span className="min-w-10 text-center text-muted-foreground text-xs tabular-nums">
									<span aria-hidden="true">
										{currentPage}/{pageCount}
									</span>
									<span className="sr-only">
										Page {currentPage} of {pageCount}
									</span>
								</span>
								<Button
									variant="outline"
									size="icon-sm"
									aria-label="Next page"
									disabled={currentPage >= pageCount}
									onClick={() => setPage(currentPage + 1)}
								>
									<ChevronRight />
								</Button>
							</nav>
						</CardFooter>
					</Card>
					<footer className="flex flex-wrap justify-between gap-2 border-t pt-4 text-muted-foreground text-xs">
						<span>Elvo Links · Short Links. Clean Experience.</span>
						<span>Workspace prototype · Sample data only</span>
					</footer>
				</main>
				<Dialog open={accountOpen} onOpenChange={setAccountOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Personal account</DialogTitle>
							<DialogDescription>
								Demo profile for the dashboard prototype.
							</DialogDescription>
						</DialogHeader>
						<FieldGroup>
							<Field>
								<FieldLabel>Name</FieldLabel>
								<p className="text-sm">VK</p>
							</Field>
							<Field>
								<FieldLabel>Plan</FieldLabel>
								<p className="text-sm">
									Free · {links.length} of 100 links used
								</p>
							</Field>
						</FieldGroup>
					</DialogContent>
				</Dialog>
				<Dialog
					open={!!selected}
					onOpenChange={(open) => {
						if (!open) {
							if (panel?.kind === "edit" && selected && editFormRef.current) {
								const data = new FormData(editFormRef.current);
								if (
									String(data.get("title")) !== selected.title ||
									String(data.get("destination")) !== selected.destination
								) {
									setDiscardOpen(true);
									return;
								}
							}
							setPanel(null);
							setEditError("");
						}
					}}
				>
					<DialogContent className="min-w-0">
						<DialogHeader>
							<DialogTitle>
								{panel?.kind === "analytics"
									? "Click analytics"
									: panel?.kind === "qr"
										? "Link QR code"
										: "Edit link"}
							</DialogTitle>
							<DialogDescription>{selected?.title}</DialogDescription>
						</DialogHeader>
						{selected && panel?.kind === "analytics" ? (
							<div className="flex min-w-0 flex-col gap-4">
								<div>
									<p className="text-muted-foreground text-sm">Total clicks</p>
									<p className="font-semibold text-3xl tabular-nums">
										{formatNumber(selected.clicks)}
									</p>
								</div>
								<ChartContainer
									config={{
										clicks: { label: "Clicks", color: "var(--foreground)" },
									}}
									className="h-48 w-full min-w-0 max-w-full"
								>
									<BarChart accessibilityLayer data={activity}>
										<CartesianGrid vertical={false} />
										<XAxis
											dataKey="day"
											tickLine={false}
											axisLine={false}
											minTickGap={40}
										/>
										<ChartTooltip content={<ChartTooltipContent />} />
										<Bar dataKey="clicks" fill="var(--color-clicks)" />
									</BarChart>
								</ChartContainer>
								<p className="text-muted-foreground text-xs">
									Illustrative chart · Last 30 days · UTC. Sample data includes
									repeat visits and bots.
								</p>
							</div>
						) : null}
						{selected && panel?.kind === "qr" ? (
							<QrDownload code={selected.code} />
						) : null}
						{selected && panel?.kind === "edit" ? (
							<form
								key={selected.code}
								ref={editFormRef}
								onSubmit={editLink}
								noValidate
							>
								<FieldGroup>
									<Field>
										<FieldLabel htmlFor="edit-title">Link title</FieldLabel>
										<Input
											id="edit-title"
											name="title"
											defaultValue={selected.title}
											maxLength={120}
										/>
									</Field>
									<Field data-invalid={!!editError}>
										<FieldLabel htmlFor="edit-url">Destination URL</FieldLabel>
										<Input
											id="edit-url"
											ref={editDestinationRef}
											aria-invalid={!!editError}
											aria-describedby={
												editError ? "edit-url-error" : undefined
											}
											spellCheck={false}
											autoComplete="off"
											onChange={() => setEditError("")}
											name="destination"
											type="url"
											required
											defaultValue={selected.destination}
										/>
										<FieldDescription>
											The short URL stays the same.
										</FieldDescription>
										{editError ? (
											<FieldError id="edit-url-error">{editError}</FieldError>
										) : null}
									</Field>
									<Button type="submit">Save changes</Button>
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
								Your link has unsaved changes. Keep editing to save them, or
								discard them to close.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Keep editing</AlertDialogCancel>
							<AlertDialogAction
								onClick={() => {
									setDiscardOpen(false);
									setPanel(null);
									setEditError("");
								}}
							>
								Discard changes
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		</TooltipProvider>
	);
}
