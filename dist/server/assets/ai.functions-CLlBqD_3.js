import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "../server.js";
//#region node_modules/@tanstack/start-server-core/dist/esm/createServerRpc.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
//#endregion
//#region src/lib/ai.functions.ts?tss-serverfn-split
var STYLES = [
	"intelligent",
	"short",
	"analytical",
	"alternative"
];
var generateReply_createServerFn_handler = createServerRpc({
	id: "428598bd574d77a17a760f32df255b873af598093212895be4024eb0f2c9bf4f",
	name: "generateReply",
	filename: "src/lib/ai.functions.ts"
}, (opts) => generateReply.__executeServer(opts));
var generateReply = createServerFn({ method: "POST" }).validator((input) => {
	const data = input ?? {};
	const post = typeof data.post === "string" ? data.post.trim() : "";
	if (!post) throw new Error("Missing post");
	const style = STYLES.includes(data.style) ? data.style : "intelligent";
	return {
		post: post.slice(0, 2e3),
		context: typeof data.context === "string" ? data.context.slice(0, 2e3) : "",
		author: typeof data.author === "string" ? data.author.slice(0, 80) : "them",
		style
	};
}).handler(generateReply_createServerFn_handler, async ({ data }) => {
	const { draftReply } = await import("./draft-reply.server-DccYMqXl.js").then((n) => n.n);
	return draftReply(data);
});
//#endregion
export { generateReply_createServerFn_handler };
