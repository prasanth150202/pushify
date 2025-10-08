export async function callInternalAndExternal({ internalUrl, internalInit, externalUrl, externalInit }) {
	const callSafely = async (url, init) => {
		try {
			const res = await fetch(url, init);
			const contentType = res.headers.get("content-type") || "";
			const isJson = contentType.includes("application/json");
			const data = isJson ? await res.json().catch(() => ({})) : await res.text();

			return {
				ok: res.ok,
				status: res.status,
				headers: Object.fromEntries(res.headers.entries()),
				data,
			};
		} catch (error) {
			return {
				ok: false,
				status: 0,
				headers: {},
				error: error?.message || "Unknown error",
			};
		}
	};

	const [internal, external] = await Promise.all([
		callSafely(internalUrl, internalInit),
		callSafely(externalUrl, externalInit),
	]);

	return {
		success: internal.ok && external.ok,
		internal,
		external,
	};
}

