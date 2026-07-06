
async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
	const response = await fetch(url, options);
	if (!response.ok) {
		throw new Error(`Upstream returned error: HTTP ${response.status} ${response.statusText}`);
	}
	return response;
}

function findTemplateLinks(targets: string[], sitemapText: string): string[] {
	const locRegex = /<loc>(https?:\/\/[^<]+)<\/loc>/gi;
	const urls: string[] = [];
	let match;

	while ((match = locRegex.exec(sitemapText)) !== null) {
		urls.push(match[1]);
	}

	return targets.map(target => {
		const cleanTarget = target.trim().toLowerCase();
		const matches = urls.filter(url => {
			const lastSegment = url.split('/').pop() || '';
			return lastSegment.toLowerCase().includes(cleanTarget);
		});

		if (matches.length > 1) {
			throw new Error(`Ambiguous template name '${target}': multiple matches found in sitemap.`);
		}
		if (matches.length === 0) {
			throw new Error(`Template '${target}' not found in sitemap.`);
		}
		return matches[0];
	});
}

async function extractTemplateText(link: string | undefined): Promise<string> {
	if (!link) {
		throw new Error("Cannot extract template: link is undefined.");
	}

	const response = await safeFetch(link);

	let accumulatedText = '';

	const rewriter = new HTMLRewriter().on('code.language-dockerignore', {
		text(chunk) {
			accumulatedText += chunk.text;
		}
	});

	await rewriter.transform(response).text();

	const trimmedText = accumulatedText.trim();
	if (!trimmedText) {
		throw new Error(`Template content is empty or element 'code.language-dockerignore' was not found at ${link}`);
	}

	return trimmedText;
}


async function fetchWorker(request: Request): Promise<Response> {

	const url = new URL(request.url);

	const hostParts = url.hostname.split('.');
	const subdomain = hostParts.length > 2 ? hostParts[0].toLowerCase() : '';

	const isG = ['g', 'gi', 'git', 'gitignore'].includes(subdomain);
	const isD = ['d', 'di', 'docker', 'dockerignore'].includes(subdomain);

	if (isG && isD || !isG && !isD) {
		return new Response("ERROR: Couldn't determine the type (G/D).", {
			status: 400,
		});
	}

	const cleanPath = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;

	if (!cleanPath) {
		return new Response("Please append your requested templates to the URL path (e.g., /node,python).", {
			status: 400,
		});
	}

	if (isG) {
		return await safeFetch(`https://gitignore.io/api/${cleanPath}${url.search}`);
	}

	if (isD) {
		const sitemapRawData = await safeFetch(`https://dockerignore.com/storage/sitemap-dockerignores-0.xml`);
		const sitemapText = await sitemapRawData.text();

		const targetWords = cleanPath.split(',').map(t => t.trim().toLowerCase());
		const links = findTemplateLinks(targetWords, sitemapText);

		const templatePromises = links.map(link => extractTemplateText(link));
		const templates = await Promise.all(templatePromises);
		const templatesText = templates.join('\n');

		return new Response(templatesText);
	}

	return Response.json({ status: "ok" });
}


export default {
	async fetch(request: Request): Promise<Response> {
		try {
			return await fetchWorker(request);
		} catch (error: any) {
			return new Response(`Error: ${error.message}`, {
				status: 502,
			});
		}
	},
};
