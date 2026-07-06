export default {
	async fetch(request) {
		const url = new URL(request.url);
		const subdomain = url.hostname.split('.')[0];
		console.log(subdomain)
		const isG = subdomain in ['g', 'gi', 'git', 'gitignore'];
		const isD = subdomain in ['d', 'di', 'docker', 'dockerignore'];
		console.log(isG, isD)
		if (isG && isD || !isG && !isD) {
			return new Response("ERROR!!! Couldn't determine the type (G/D).");
		}
		if (isG) {
			const response = await fetch(`https://gitignore.io/api/${url.pathname}`);
			const text = await response.text();
			return new Response(text);
		}
		if (isD) {
			const response = await fetch(`https://markdown.new/dockerignore.com/dockerignores/${url.pathname}`);
			const text = await response.text();
			return new Response(text);
		}
	},
};
