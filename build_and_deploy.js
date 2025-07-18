async function deleteAllFiles() {
  console.log('🧹 Fetching and deleting existing files...');
  const options = {
    method: 'GET',
    host: 'neocities.org',
    path: '/api/list',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
  };

  const res = await httpsRequest(options);
  if (res.status !== 200) {
    throw new Error(`Failed to fetch file list: ${res.status}`);
  }

  const parsed = tryParseJSON(res.body);
  if (!parsed || !parsed.files) {
    throw new Error('Could not parse file list');
  }

  const files = parsed.files
    .filter((f) => f.is_directory !== true) // 🚫 ignore directories
    .map((f) => f.path);

  if (files.length === 0) {
    console.log('📂 No files to delete.');
    return;
  }

  for (const file of files) {
    console.log(`❌ Deleting: ${file}`);
    const form = new FormData();
    form.append('delete[]', file);

    const deleteOptions = {
      method: 'POST',
      host: 'neocities.org',
      path: '/api/delete',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        ...form.getHeaders(),
      },
    };

    const delRes = await httpsRequest(deleteOptions, form);
    if (delRes.status !== 200) {
      console.warn(`⚠️ Failed to delete ${file}:`, delRes.body);
    } else {
      await sleep(THROTTLE_DELAY_MS);
    }
  }
}
