import { d as Button } from "./app-shell-BZgXozVv.js";
import { jsx, jsxs } from "react/jsx-runtime";
import * as Dialog from "@radix-ui/react-dialog";
//#region src/components/confirm-dialog.tsx
function ConfirmDialog({ open, title, body, confirmLabel, busy, onConfirm, onOpenChange }) {
	return /* @__PURE__ */ jsx(Dialog.Root, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ jsxs(Dialog.Portal, { children: [/* @__PURE__ */ jsx(Dialog.Overlay, { className: "fixed inset-0 z-50 bg-bg/80" }), /* @__PURE__ */ jsxs(Dialog.Content, {
			className: "fixed left-1/2 top-1/2 z-50 w-[min(100%-2rem,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-line bg-surface p-5",
			children: [
				/* @__PURE__ */ jsx(Dialog.Title, {
					className: "text-lg font-semibold tracking-tight",
					children: title
				}),
				/* @__PURE__ */ jsx(Dialog.Description, {
					className: "mt-2 text-sm text-muted",
					children: body
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "mt-5 flex justify-end gap-2",
					children: [/* @__PURE__ */ jsx(Dialog.Close, {
						asChild: true,
						children: /* @__PURE__ */ jsx(Button, {
							variant: "ghost",
							type: "button",
							children: "Cancel"
						})
					}), /* @__PURE__ */ jsx(Button, {
						type: "button",
						variant: "primary",
						disabled: busy,
						onClick: onConfirm,
						children: busy ? "Publishing" : confirmLabel
					})]
				})
			]
		})] })
	});
}
//#endregion
export { ConfirmDialog as t };
