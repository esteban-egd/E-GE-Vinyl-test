async function test() {
  const res = await fetch(`https://www.theaudiodb.com/api/v1/json/2/search.php?s=Stromae`);
  const data = await res.json();
  console.log(data.artists[0].strBiographyFR.substring(0, 300) + '...');
  console.log("Length: " + data.artists[0].strBiographyFR.length);
}
test();
