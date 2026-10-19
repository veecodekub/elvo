import { notFound } from "next/navigation";
import DashboardPrototype from "./dashboard-prototype";

export default function PrototypePage() {
	if (process.env.NODE_ENV === "production") notFound();
	return <DashboardPrototype />;
}
