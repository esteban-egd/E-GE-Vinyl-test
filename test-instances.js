async function findWorkingInstance(query) {
  try {
    const res = await fetch('https://piped-instances.kavin.rocks/');
    const instances = await res.json();
    
    // Filter active and public instances
    const activeInstances = instances.filter(i => 
      i.up_to_date && i.locations && i.locations.length > 0 && i.api
    );

    console.log(`Found ${activeInstances.length} active instances.`);
    
    for (const instance of activeInstances) {
      console.log(`Testing instance: ${instance.api_url}`);
      try {
        const testRes = await fetch(
          `${instance.api_url}/search?q=${encodeURIComponent(query)}&filter=music_songs`,
          { signal: AbortSignal.timeout(4000) }
        );
        console.log(`Status: ${testRes.status}`);
        if (!testRes.ok) continue;

        const data = await testRes.json();
        if (data.items && data.items.length > 0) {
            console.log(`Working instance found: ${instance.api_url}`);
            return instance.api_url;
        }
      } catch (e) {
        console.log(`Error: ${e.message}`);
      }
    }
  } catch (err) {
    console.error("Error fetching instances list", err);
  }
}

findWorkingInstance('Daft Punk');
