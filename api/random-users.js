export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const results = searchParams.get('results') || '20'
  const gender = searchParams.get('gender') || 'female'

  const upstreamUrl = `https://randomuser.me/api/?results=${encodeURIComponent(
    results,
  )}&gender=${encodeURIComponent(gender)}`

  try {
    const upstream = await fetch(upstreamUrl)
    const body = await upstream.text()

    return new Response(body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Upstream randomuser.me request failed' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      },
    )
  }
}

