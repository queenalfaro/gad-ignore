export default {
	async fetch(request) {
		const url = new URL(request.url);
		const response = await fetch(`https://gitignore.io/api/${url.pathname}`);
		const text = await response.text();
		return new Response(text);
	},
};
