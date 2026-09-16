// electron/auth/location-service.js
mapbox_base_url = process.env.MAPBOX_BASE_URL
mapbox_token = process.env.MAPBOX_TOKEN

async function getCoordinates(number, street, city, zipCode) {
  const res = await global.fetch(`${mapbox_base_url}?country=us&address_number=${number}&street=${street}&postcode=${zipCode}&place=${city}&access_token=${mapbox_token}`, {
    method: 'GET'
  });

  if (!res.ok) {
    throw new Error(`MapBox API error: ${res.status}`);
  }

  return res.json()
}

module.exports = { getCoordinates };