import { useState, useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, useMap, Marker, Popup, ZoomControl } from 'react-leaflet'
import { divIcon } from 'leaflet'
import { motion, AnimatePresence } from 'framer-motion'
import 'leaflet/dist/leaflet.css'

const AGE_OK_KEY = 'nearby_age_ok_v1'

// Generate random point within radius (meters) of center
function randomPointNear(lat, lon, radiusMeters = 1000) {
  const radiusDeg = radiusMeters / 111320 // ~111.32km per degree at equator
  const angle = Math.random() * 2 * Math.PI
  const r = Math.sqrt(Math.random()) * radiusDeg
  const latOffset = r * Math.cos(angle)
  const lonOffset = (r * Math.sin(angle)) / Math.cos((lat * Math.PI) / 180)
  return [lat + latOffset, lon + lonOffset]
}

function buildFallbackProfiles(lat, lon, count) {
  const names = ['Anna', 'Maria', 'Sofia', 'Emma', 'Olivia', 'Mia', 'Eva', 'Daria']
  const profiles = []
  for (let i = 0; i < count; i += 1) {
    const [profileLat, profileLon] = randomPointNear(lat, lon, 1000)
    profiles.push({
      id: `fallback-${Date.now()}-${i}`,
      name: names[i % names.length],
      age: 21 + (i % 15),
      photo: `https://randomuser.me/api/portraits/women/${i % 90}.jpg`,
      lat: profileLat,
      lon: profileLon,
    })
  }
  return profiles
}

function MapUpdater({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.setView(center, 16)
  }, [center, map])
  return null
}

function AgeGate({ onAccept, onDecline, declined }) {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-pink-500 via-orange-400 to-pink-600 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 22, stiffness: 260 }}
        className="w-full max-w-md"
      >
        <div className="rounded-3xl p-[1px] bg-white/30 shadow-2xl">
          <div className="rounded-3xl bg-white/90 backdrop-blur-md p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-orange-500 px-3 py-1 text-white text-xs font-extrabold">
                  18+
                  <span className="text-white/90 font-semibold">Age required</span>
                </div>
                <h1 className="mt-3 text-2xl font-black text-gray-900 leading-tight">
                  Соглашение
                </h1>
                <p className="mt-2 text-sm text-gray-700">
                  Чтобы пользоваться приложением, подтвердите, что вам есть 18 лет.
                </p>
              </div>
              <div className="shrink-0 rounded-2xl bg-gradient-to-br from-pink-500/15 to-orange-500/15 px-3 py-2 text-center">
                <div className="text-[10px] font-bold text-gray-700">Live</div>
                <div className="text-sm font-black text-gray-900">Map</div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-gray-50 border border-gray-200 p-4">
              <div className="text-xs font-extrabold text-gray-900 tracking-wide">
                Вы подтверждаете, что:
              </div>
              <ul className="mt-2 space-y-2 text-sm text-gray-700">
                <li className="flex gap-2">
                  <span className="mt-[2px] h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-black">
                    ✓
                  </span>
                  Вам исполнилось 18 лет
                </li>
                <li className="flex gap-2">
                  <span className="mt-[2px] h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-black">
                    ✓
                  </span>
                  Вы согласны на использование геолокации для показа анкет рядом
                </li>
              </ul>
            </div>

            {declined && (
              <div className="mt-4 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                Доступ закрыт. Для использования приложения требуется 18+.
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onDecline}
                className="flex-1 py-3 px-4 rounded-2xl bg-gray-200 text-gray-700 font-semibold"
              >
                Нет
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onAccept}
                className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-pink-500 to-orange-500 text-white font-extrabold shadow-lg shadow-pink-500/25"
              >
                Мне есть 18
              </motion.button>
            </div>

            <div className="mt-4 text-[11px] text-gray-500">
              Нажимая «Мне есть 18», вы подтверждаете возраст. Данные геолокации используются
              только для отображения карты и анкет рядом.
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function App() {
  const [ageOk, setAgeOk] = useState(() => {
    try {
      return localStorage.getItem(AGE_OK_KEY) === '1'
    } catch {
      return false
    }
  })
  const [ageDeclined, setAgeDeclined] = useState(false)
  const [userLocation, setUserLocation] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [swipedProfiles, setSwipedProfiles] = useState(new Set())
  const [onlineUsers, setOnlineUsers] = useState(8234)

  const fetchProfiles = useCallback(async (lat, lon) => {
    try {
      const count = 15 + Math.floor(Math.random() * 26) // 15–40 человек
      const isLocal =
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1')
      const url = isLocal
        ? `https://randomuser.me/api/?results=${count}&gender=female`
        : `/api/random-users?results=${count}&gender=female`
      const res = await fetch(url)
      const data = await res.json()
      const apiResults = Array.isArray(data.results) ? data.results : []
      const users =
        apiResults.length > 0
          ? apiResults.map((u) => {
              const [profileLat, profileLon] = randomPointNear(lat, lon, 1000)
              return {
                id: u.login.uuid,
                name: `${u.name.first} ${u.name.last}`,
                age: u.dob.age,
                photo: u.picture.large,
                lat: profileLat,
                lon: profileLon,
              }
            })
          : buildFallbackProfiles(lat, lon, count)
      setProfiles(users)
    } catch (err) {
      setProfiles(buildFallbackProfiles(lat, lon, 20))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!ageOk) return
    if (!navigator.geolocation) {
      setError('Geolocation not supported')
      setLoading(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setUserLocation([latitude, longitude])
        fetchProfiles(latitude, longitude)
      },
      () => {
        setError('Could not get location')
        setLoading(false)
      },
      { enableHighAccuracy: true }
    )
  }, [ageOk, fetchProfiles])

  useEffect(() => {
    const id = setInterval(() => {
      setOnlineUsers((prev) => {
        const delta = Math.floor(Math.random() * 41) - 20 // -20..+20
        const next = prev + delta
        return Math.max(1000, next)
      })
    }, 2500)
    return () => clearInterval(id)
  }, [])

  const handleLike = () => {
    if (selectedProfile) {
      setSwipedProfiles((prev) => new Set([...prev, selectedProfile.id]))
      setSelectedProfile(null)
      window.location.assign('https://tracer.legonas.net/tracs/app')
    }
  }

  const handlePass = () => {
    if (selectedProfile) {
      setSwipedProfiles((prev) => new Set([...prev, selectedProfile.id]))
      setSelectedProfile(null)
    }
  }

  const createAvatarIcon = (photoUrl) =>
    divIcon({
      html: `<img src="${photoUrl}" alt="" style="width:48px;height:48px;border-radius:50%;object-fit:cover;border:4px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.3);cursor:pointer" />`,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
      className: 'avatar-marker',
    })

  const userLocationIcon = divIcon({
    html: `<div class="user-location-marker"><span>Вы</span></div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    className: 'user-marker',
  })

  const visibleProfiles = profiles.filter((p) => !swipedProfiles.has(p.id))

  if (!ageOk) {
    return (
      <AgeGate
        declined={ageDeclined}
        onDecline={() => setAgeDeclined(true)}
        onAccept={() => {
          try {
            localStorage.setItem(AGE_OK_KEY, '1')
          } catch {
            // ignore
          }
          setAgeDeclined(false)
          setError(null)
          setSelectedProfile(null)
          setSwipedProfiles(new Set())
          setProfiles([])
          setUserLocation(null)
          setLoading(true)
          setAgeOk(true)
        }}
      />
    )
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-pink-500 via-orange-400 to-pink-600 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-white text-center"
        >
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xl font-semibold">Finding people near you...</p>
        </motion.div>
      </div>
    )
  }

  if (error || !userLocation) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-pink-500 via-orange-400 to-pink-600 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-white text-center max-w-sm"
        >
          <p className="text-xl font-semibold mb-2">{error || 'Location required'}</p>
          <p className="text-white/90 text-sm">Enable location access to see profiles nearby.</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-gradient-to-br from-pink-500/20 via-orange-400/20 to-pink-600/20">
      <header className="flex-shrink-0 py-4 px-4 bg-gradient-to-r from-pink-500 to-orange-500 text-white shadow-lg">
        <h1 className="text-xl font-bold text-center">Nearby</h1>
      </header>

      <div className="flex-1 relative min-h-0">
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', damping: 20, stiffness: 250 }}
          className="absolute top-3 right-3 z-[1100] pointer-events-none"
        >
          <div className="rounded-2xl p-[1px] bg-gradient-to-br from-pink-500 via-orange-400 to-pink-600 shadow-lg">
            <div className="rounded-2xl bg-white/80 backdrop-blur-md px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="relative inline-flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
                <div className="text-[12px] font-extrabold tracking-wide text-gray-900">
                  Live Traffic
                </div>
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-3">
                <div className="text-[11px] font-medium text-gray-600">Online users</div>
                <div className="text-sm font-black tabular-nums text-gray-900">
                  {onlineUsers.toLocaleString('en-US')}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <MapContainer
          center={userLocation}
          zoom={16}
          className="h-full w-full"
          zoomControl={false}
        >
          <ZoomControl position="bottomright" />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapUpdater center={userLocation} />

          {/* Реальная локация пользователя */}
          <Marker position={userLocation} icon={userLocationIcon}>
            <Popup>
              <strong>Вы здесь</strong>
              <br />
              {userLocation[0].toFixed(5)}, {userLocation[1].toFixed(5)}
            </Popup>
          </Marker>

          {/* Profile avatars */}
          {visibleProfiles.map((profile) => (
            <Marker
              key={profile.id}
              position={[profile.lat, profile.lon]}
              icon={createAvatarIcon(profile.photo)}
              eventHandlers={{
                click: () => setSelectedProfile(profile),
              }}
            >
              <Popup>{profile.name}</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <AnimatePresence>
        {selectedProfile && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[1000]"
              onClick={() => setSelectedProfile(null)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[1001] rounded-t-3xl overflow-hidden shadow-2xl"
            >
              <div className="bg-gradient-to-br from-white to-pink-50/80 backdrop-blur-sm pt-6 pb-8 px-6">
                <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
                <div className="flex items-center gap-4 mb-6">
                  <motion.img
                    src={selectedProfile.photo}
                    alt={selectedProfile.name}
                    className="w-20 h-20 rounded-full object-cover border-4 border-pink-200 shadow-md"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: 'spring' }}
                  />
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{selectedProfile.name}</h2>
                    <p className="text-gray-600">{selectedProfile.age} years old</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handlePass}
                    className="flex-1 py-3 px-6 rounded-2xl bg-gray-200 text-gray-700 font-semibold flex items-center justify-center gap-2"
                  >
                    <span className="text-xl">✕</span> Pass
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleLike}
                    className="flex-1 py-3 px-6 rounded-2xl bg-gradient-to-r from-pink-500 to-orange-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-pink-500/30"
                  >
                    <span className="text-xl">♥</span> Like
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
