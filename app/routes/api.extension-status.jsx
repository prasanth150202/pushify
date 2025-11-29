import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  try {
    const { admin, session } = await authenticate.admin(request);

    // Get the URL to check if debug mode is requested
    const url = new URL(request.url);
    const debug = url.searchParams.get('debug') === 'true';

    // Query the published theme
    const response = await admin.graphql(`
      {
        themes(first: 1, roles: MAIN) {
          nodes {
            id
            name
          }
        }
      }
    `);

    const data = await response.json();

    // Check if there's a published theme
    const themes = data.data?.themes?.nodes || [];

    if (themes.length === 0) {
      return json({ enabled: false, message: "No published theme found" });
    }

    const themeId = themes[0].id;
    const themeIdNumber = themeId.split('/').pop(); // Extract numeric ID

    // Use fetch to get theme asset via REST API
    const assetUrl = `https://${session.shop}/admin/api/2025-01/themes/${themeIdNumber}/assets.json?asset[key]=config/settings_data.json`;

    const assetResponse = await fetch(assetUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': session.accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!assetResponse.ok) {
      throw new Error(`Failed to fetch theme asset: ${assetResponse.statusText}`);
    }

    const assetData = await assetResponse.json();

    if (!assetData.asset || !assetData.asset.value) {
      return json({ enabled: false, message: "Settings file not found" });
    }

    const settings = JSON.parse(assetData.asset.value);
    const appEmbedId = "76a0889c1a8ffc064c4cf865e40fdd92";

    // Check current blocks
    const currentBlocks = settings.current?.blocks || {};

    let isEnabled = false;
    let matchedBlock = null;

    // Check if our app embed exists
    for (const [blockId, blockData] of Object.entries(currentBlocks)) {
      // Check if the block type contains our app embed ID (case insensitive, flexible matching)
      const blockType = blockData.type || '';
      const isMatch = blockType.toLowerCase().includes(appEmbedId.toLowerCase()) ||
        blockType.includes('pushnova') ||
        blockType.includes('push-nova') ||
        blockType.includes('push_nova');

      if (isMatch) {
        matchedBlock = { id: blockId, ...blockData };
        // Block is enabled if:
        // 1. disabled property doesn't exist (default enabled)
        // 2. disabled is explicitly false
        if (blockData.disabled === undefined || blockData.disabled === false) {
          isEnabled = true;
        }
        break;
      }
    }

    // Debug mode returns full details
    if (debug) {
      return json({
        enabled: isEnabled,
        debug: {
          themeId,
          themeName: themes[0].name,
          totalBlocks: Object.keys(currentBlocks).length,
          appEmbedId,
          matchedBlock,
          allBlockTypes: Object.entries(currentBlocks).map(([id, data]) => ({
            id,
            type: data.type,
            disabled: data.disabled
          }))
        }
      });
    }

    console.log("Extension status check:", {
      isEnabled,
      matchedBlock: matchedBlock ? matchedBlock.id : 'none',
      blocksChecked: Object.keys(currentBlocks).length
    });

    return json({ enabled: isEnabled });
  } catch (err) {
    console.error("Error checking extension status:", err);
    return json({ enabled: false, error: err.message }, { status: 500 });
  }
};
