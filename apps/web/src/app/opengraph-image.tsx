import { ImageResponse } from "next/og";

import { SITE_NAME } from "@/lib/brand";

export const alt = `${SITE_NAME} — Short links with QR codes and click analytics`;
export const size = {
	width: 1200,
	height: 630,
};
export const contentType = "image/png";

const chips = ["Short links", "QR codes", "Click analytics"];

export default function OpenGraphImage() {
	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				justifyContent: "space-between",
				backgroundColor: "#09090b",
				color: "#fafafa",
				padding: "72px",
				fontFamily: "sans-serif",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "14px",
					fontSize: 30,
					letterSpacing: "-0.03em",
				}}
			>
				<span style={{ fontWeight: 700 }}>elvo</span>
				<span style={{ color: "#a1a1aa", fontWeight: 400 }}>/ links</span>
			</div>
			<div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
				<div
					style={{
						display: "flex",
						maxWidth: "920px",
						fontSize: 70,
						fontWeight: 600,
						letterSpacing: "-0.055em",
						lineHeight: 1.05,
					}}
				>
					Short links with QR codes and clear click analytics.
				</div>
				<div style={{ display: "flex", fontSize: 28, color: "#a1a1aa" }}>
					Short Links. Clean Experience.
				</div>
			</div>
			<div style={{ display: "flex", gap: "12px" }}>
				{chips.map((chip) => (
					<div
						key={chip}
						style={{
							display: "flex",
							border: "1px solid #3f3f46",
							borderRadius: "999px",
							padding: "10px 18px",
							fontSize: 22,
							color: "#d4d4d8",
						}}
					>
						{chip}
					</div>
				))}
			</div>
		</div>,
		{
			...size,
		},
	);
}
