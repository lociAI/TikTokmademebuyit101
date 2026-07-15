const axios = require('axios');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = 'lociAI/TikTokmademebuyit101';
const FILE_PATH = 'products.json';
const PROFIT_MARGIN = 1.50; // 50% markup

async function runDailySync() {
  console.log('Running daily product sync...');
  if (!GITHUB_TOKEN) {
    console.error('Error: GITHUB_TOKEN environment variable is not set.');
    return;
  }

  try {
    // 1. Fetch trending items (using an open mock API for demo; can swap with AliExpress Affiliate API)
    const apiRes = await axios.get('https://dummyjson.com/products/category/smartphones');
    const sourceProducts = apiRes.data.products;

    // 2. Format product details
    const formattedProducts = sourceProducts.map(p => ({
      asin: '',
      title: p.title,
      link: 'https://example.com/product/' + p.id,
      image_url: p.thumbnail,
      price: 'USD ' + p.price,
      rank: '#' + p.id,
      source: 'AliExpress (API)',
      aliexpress_url: 'https://example.com/product/' + p.id,
      aliexpress_id: String(p.id),
      images: p.images || [],
      retail_price: '$' + (p.price * PROFIT_MARGIN).toFixed(2)
    }));

    // 3. Fetch current products.json from GitHub
    const url = 'https://api.github.com/repos/' + REPO + '/contents/' + FILE_PATH;
    const reqHeaders = {
      'Authorization': 'Bearer ' + GITHUB_TOKEN,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'NodeJS'
    };

    const fileRes = await axios.get(url, { headers: reqHeaders });
    const content = Buffer.from(fileRes.data.content, 'base64').toString('utf8');
    const existingProducts = JSON.parse(content);

    // 4. Merge items while avoiding duplicates
    const existingIds = new Set(existingProducts.map(p => p.aliexpress_id));
    const newItems = formattedProducts.filter(p => !existingIds.has(p.aliexpress_id));

    if (newItems.length === 0) {
      console.log('No new items found today.');
      return;
    }

    const updatedProducts = [...newItems, ...existingProducts];
    const updatedContentBase64 = Buffer.from(JSON.stringify(updatedProducts, null, 4)).toString('base64');

    // 5. Commit updated products back to GitHub
    const body = {
      message: 'Daily Sync: Added ' + newItems.length + ' new products',
      content: updatedContentBase64,
      sha: fileRes.data.sha
    };

    await axios.put(url, body, { headers: reqHeaders });
    console.log('Successfully synced! Added ' + newItems.length + ' new items.');

  } catch (error) {
    console.error('Error during sync:', error.response ? error.response.data : error.message);
  }
}

runDailySync();