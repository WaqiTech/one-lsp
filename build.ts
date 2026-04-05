import { build } from "bun";

async function runBuild() {
	console.log("Starting build...");
	const result = await build({
		entrypoints: ["./src/extension.ts"],
		outdir: "./out",
		target: "node",
		format: "cjs",
		external: ["vscode"],
		sourcemap: "external",
		minify: true,
	});

	if (!result.success) {
		console.error("Build failed");
		for (const message of result.logs) {
			console.error(message);
		}
		process.exit(1);
	} else {
		console.log("Build succeeded! Extension built to ./out/extension.js");
	}
}

runBuild().catch((err) => {
	console.error("An unexpected error occurred during build:", err);
	process.exit(1);
});
