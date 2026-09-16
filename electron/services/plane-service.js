// electron/auth/token-service.js
os_base_url = process.env.OS_BASE_URL
aero_base_url = process.env.AERO_BASE_URL
api_key = process.env.AERO_API_KEY

async function getPlanesOverhead(token, latitude, longitude) {
  console.log('Latitude: ', latitude, 'Longitude: ', longitude)

  const lamin = (Number(latitude) - 0.05).toFixed(4);
  const lamax = (Number(latitude) + 0.05).toFixed(4);
  const lomin = (Number(longitude) - 0.05).toFixed(4);
  const lomax = (Number(longitude) + 0.05).toFixed(4);

  console.log(`URL for OpenSky request: ${os_base_url}/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`)

  const res = await global.fetch(`${os_base_url}/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    },
  });

  if (!res.ok) {
    throw new Error(`OpenSky API error: ${res.status}`);
  }

  return res.json();
}

async function getFlightInfo(callSign) {
    const res = await global.fetch(`${aero_base_url}/flights/${callSign}`, {
    method: 'GET',
    headers: {
      'x-apikey': api_key
    },
  });

  if (!res.ok) {
    throw new Error(`AeroAPI error: ${res.status}`);
  }

  const data = await res.json();
  console.log(data);

  return data; 
}

module.exports = { getPlanesOverhead, getFlightInfo };