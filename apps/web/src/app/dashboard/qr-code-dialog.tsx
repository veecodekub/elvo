"use client";

import { Button } from "@elvo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@elvo/ui/components/dialog";
import { Download } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import type { ShortLink } from "@/lib/links-api";

const QR_DOWNLOAD_ERROR =
	"We couldn't create the QR code PNG. Check your browser and try again.";

function toBlackAndWhitePng(source: HTMLCanvasElement) {
	const output = document.createElement("canvas");
	output.width = source.width;
	output.height = source.height;
	const context = output.getContext("2d", { willReadFrequently: true });
	if (!context) {
		throw new Error("Canvas 2D is unavailable");
	}
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

export default function QrCodeDialog({
	link,
	onClose,
}: {
	link: ShortLink;
	onClose: () => void;
}) {
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
		<Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>QR code</DialogTitle>
					<DialogDescription>
						Scan or download the QR code for this short link.
					</DialogDescription>
				</DialogHeader>
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
						This QR code opens the short link and keeps working when the
						destination changes.
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
			</DialogContent>
		</Dialog>
	);
}
