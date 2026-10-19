"use client";

// Selected Compact prototype. All demo changes are held in memory.
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
	ArrowDownLeft,
	ArrowUpRight,
	BarChart3,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Copy,
	Download,
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
		clicks: 128,
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
				<span>↗ {new URL(destination).hostname}</span>
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
		<Tooltip>
			<TooltipTrigger
				render={
					<Switch
						checked={link.active}
						aria-label={`Enable ${link.title}`}
						onCheckedChange={(checked) => onChange(link, checked)}
					/>
				}
			/>
			<TooltipContent>
				{link.active ? "Disable link" : "Enable link"}
			</TooltipContent>
		</Tooltip>
	);
}

export default function DashboardPrototype() {
	const [links, setLinks] = useState(initialLinks);
	const [query, setQuery] = useState("");
	const [status, setStatus] = useState("all");
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
	const total = links.reduce((sum, link) => sum + link.clicks, 0);
	const visible = links.filter(
		(link) =>
			(status === "all" ||
				(status === "active" ? link.active : !link.active)) &&
			`${link.title} ${link.destination} ${link.code}`
				.toLowerCase()
				.includes(query.toLowerCase()),
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
			<div className="min-h-svh min-w-0 bg-background text-foreground">
				<div className="flex flex-wrap items-center justify-center gap-2 bg-muted px-4 py-2 text-foreground text-xs">
					<Badge variant="outline">Prototype</Badge>
					<span>Sample data. Nothing is saved.</span>
				</div>
				<header className="border-b">
					<div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
						<div className="flex items-center gap-3">
							<Button
								variant="default"
								size="icon"
								aria-label="Elvo Links home"
								onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
							>
								<ArrowDownLeft />
							</Button>
							<span className="font-semibold text-xl tracking-tight">
								elvo{" "}
								<span className="font-normal text-muted-foreground text-sm">
									/ links
								</span>
							</span>
							<Separator
								orientation="vertical"
								className="mx-3 hidden h-5 data-vertical:self-center sm:block"
							/>
							<span className="hidden font-medium text-sm sm:inline">
								Your links
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
				<main className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-4 px-4 py-6 sm:gap-6 sm:px-6">
					<div className="flex flex-wrap items-end justify-between gap-4">
						<div>
							<h1 className="font-semibold text-2xl tracking-tight">
								Your links
							</h1>
							<p className="mt-1 text-muted-foreground text-sm">
								A simple home for everything you share.
							</p>
						</div>
						<div className="flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
							<Badge variant="secondary">{links.length} / 100 links</Badge>
							<span>{formatNumber(total)} total clicks</span>
						</div>
					</div>
					<Card className="min-w-0">
						<CardHeader>
							<CardTitle>Create a short link</CardTitle>
						</CardHeader>
						<CardContent>
							<form onSubmit={createLink} noValidate>
								<FieldGroup className="gap-3 md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] md:items-end">
									<Field data-invalid={!!createError}>
										<FieldLabel htmlFor="destination">
											Destination URL
										</FieldLabel>
										<InputGroup>
											<InputGroupAddon>
												<Link2 />
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
									<Button type="submit" disabled={links.length >= 100}>
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
					<Card className="min-w-0">
						<CardHeader className="gap-4 sm:flex sm:flex-row sm:items-center sm:justify-between">
							<div className="flex items-center gap-2">
								<CardTitle>All links</CardTitle>
								<Badge variant="secondary">{links.length}</Badge>
							</div>
							<div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
								<InputGroup className="sm:w-64">
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
							<div className="grid gap-3 md:hidden">
								{pageLinks.map((link) => (
									<Card key={link.code} size="sm" className="min-w-0 gap-2">
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
										<CardContent className="flex min-w-0 flex-col gap-1">
											<Button
												variant="link"
												className="h-auto justify-start p-0"
												onClick={() => copy(link.code)}
												aria-label={`Copy short URL for ${link.title}`}
											>
												<span className="truncate font-mono">
													elvo.example/{link.code}
												</span>
												<Copy data-icon="inline-end" />
											</Button>
											<LinkDestination destination={link.destination} />
											<Tooltip>
												<TooltipTrigger
													render={
														<Button
															variant="link"
															className="h-auto w-fit justify-start p-0"
															aria-label={`Creation time for ${link.title}`}
														/>
													}
												>
													<time dateTime={link.createdAt}>
														Created{" "}
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
										</CardContent>
										<CardFooter className="justify-between">
											<Button
												variant="ghost"
												size="sm"
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
											<LinkStatus link={link} onChange={changeStatus} />
										</CardFooter>
									</Card>
								))}
							</div>
							<div className="hidden md:block">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Link / destination</TableHead>
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
													<div className="flex w-44 min-w-0 flex-col gap-1 lg:w-80">
														<span className="truncate font-medium">
															{link.title}
														</span>
														<button
															type="button"
															className="flex items-center gap-2 text-left font-mono text-muted-foreground text-xs hover:text-foreground"
															onClick={() => copy(link.code)}
															aria-label={`Copy short URL for ${link.title}`}
														>
															elvo.example/{link.code}
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
														<Tooltip>
															<TooltipTrigger
																render={
																	<Button
																		variant="ghost"
																		size="icon"
																		aria-label={`Copy ${link.title}`}
																		onClick={() => copy(link.code)}
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
																		aria-label={`QR for ${link.title}`}
																		onClick={() =>
																			setPanel({ kind: "qr", code: link.code })
																		}
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
																		aria-label={`Edit ${link.title}`}
																		onClick={() =>
																			setPanel({
																				kind: "edit",
																				code: link.code,
																			})
																		}
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
						<CardFooter className="flex-wrap justify-between gap-3">
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
					<footer className="flex flex-wrap justify-between gap-2 text-muted-foreground text-xs">
						<span>Elvo Links · Short Links. Clean Experience.</span>
						<span>Compact prototype · Changes reset on reload</span>
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
					<DialogContent>
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
							<div className="flex flex-col gap-4">
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
									className="h-48 w-full"
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
