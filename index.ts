export default {
	async fetch(request) {
		const url = new URL(request.url);

		const hostParts = url.hostname.split('.');
		const subdomain = hostParts.length > 2 ? hostParts[0].toLowerCase() : '';

		const isG = ['g', 'gi', 'git', 'gitignore'].includes(subdomain);
		const isD = ['d', 'di', 'docker', 'dockerignore'].includes(subdomain);

		if (isG && isD || !isG && !isD) {
			return new Response("ERROR: Couldn't determine the type (G/D).", {
				status: 400,
				headers: { 'Content-Type': 'text/plain; charset=utf-8' }
			});
		}

		const cleanPath = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;

		if (!cleanPath) {
			return new Response("Please append your requested templates to the URL path (e.g., /node,python).", {
				status: 400,
				headers: { 'Content-Type': 'text/plain; charset=utf-8' }
			});
		}

		let targetUrl;
		if (isG) {
			targetUrl = `https://gitignore.io/api/${cleanPath}${url.search}`;
		} else {
			targetUrl = `https://markdown.new/dockerignore.com/dockerignores/${cleanPath}${url.search}`;
		}

		try {
			return await fetch(targetUrl);
		} catch (error) {
			return new Response(`Error fetching upstream: ${error.message}`, {
				status: 502,
				headers: { 'Content-Type': 'text/plain; charset=utf-8' }
			});
		}
	},
};