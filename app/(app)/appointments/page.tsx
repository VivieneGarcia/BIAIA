"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSupabaseAuth } from "@/components/providers/supabase-auth-provider"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CalendarIcon, Plus, Edit, Trash2, Clock, MapPin, Search, Phone } from "lucide-react"
import { format, compareAsc, parseISO } from "date-fns"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import type { Appointment } from "@/lib/types"

interface Clinic {
  fsq_id: string
  name: string
  location: {
    address: string
    locality: string
    region: string
    postcode: string
    country: string
    formatted_address: string
    lat: number
    lng: number
  }
  tel?: string
  website?: string
  categories: {
    id: number
    name: string
  }[]
  rating?: number
}

const popularClinics = [
  {
    id: 1,
    name: "Example Clinic",
    address: "123 Clinic St",
    phone: "123-456-7890",
    website: "http://example.com",
    specialties: ["OBGYN"],
    rating: 4.5,
  },
  // More clinics...
]
export default function AppointmentsPage() {
  const { user } = useSupabaseAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [title, setTitle] = useState("")
  const [date, setDate] = useState<Date>(new Date())
  const [time, setTime] = useState("09:00")
  const [notes, setNotes] = useState("")
  const [reminder, setReminder] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [locationInput, setLocationInput] = useState("")
  const [suggestions, setSuggestions] = useState<{ place_name: string }[]>([])
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "63be6904847c3692a84b9bd1", // Default: OB-GYN
  ])

  const categoryOptions = [
    { id: "63be6904847c3692a84b9bd1", name: "Obstetrician Gynecologist (Ob-gyn)" },
    { id: "63be6904847c3692a84b9bdf", name: "Women's Health Clinic" },
    { id: "4bf58dd8d48988d196941735", name: "Hospital" },
    { id: "58daa1558bbb0b01f18ec1f7", name: "Hospital Unit" },
    { id: "63be6904847c3692a84b9bbc", name: "Emergency Service" },
    { id: "56aa371be4b08b9a8d5734ff", name: "Maternity Clinic" },
    { id: "63be6904847c3692a84b9bc1", name: "Mental Health Clinic" },
  ]

  const handleDateSelect = (selected: Date | undefined) => {
    if (selected) {
      setDate(selected)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (locationInput.trim().length >= 2) {
        setIsFetchingSuggestions(true)
        fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locationInput)}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&autocomplete=true&limit=5`,
        )
          .then((res) => res.json())
          .then((data) => {
            const places = data.features.map((feature: any) => ({
              place_name: feature.place_name,
            }))
            setSuggestions(places)
          })
          .catch(() => setSuggestions([]))
          .finally(() => setIsFetchingSuggestions(false))
      } else {
        setSuggestions([])
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [locationInput])

  // Time for error prompt
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null)
      }, 3000) // hides the error after 3 seconds
  
      return () => clearTimeout(timer) // cleanup on re-render
    }
  }, [error])

  // Group appointments by date for calendar view
  const appointmentsByDate: Record<string, Appointment[]> = {}
  appointments.forEach((appointment) => {
    const dateStr = appointment.date
    if (!appointmentsByDate[dateStr]) {
      appointmentsByDate[dateStr] = []
    }
    appointmentsByDate[dateStr].push(appointment)
  })

  // Sort appointments by date (closest first)
  const sortedAppointments = [...appointments].sort((a, b) => {
    const dateA = parseISO(a.date)
    const dateB = parseISO(b.date)
    return compareAsc(dateA, dateB)
  })

  // Get upcoming appointments (today and future)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const upcomingAppointments = sortedAppointments.filter((appointment) => {
    const appointmentDate = parseISO(appointment.date)
    return appointmentDate >= today
  })

  // Get past appointments
  const pastAppointments = sortedAppointments.filter((appointment) => {
    const appointmentDate = parseISO(appointment.date)
    return appointmentDate < today
  })

  useEffect(() => {
    fetchAppointments()
  }, [user])

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="text-muted-foreground">Loading your appointments... ♡</p>
        </div>
      </div>
    )
  }

  const fetchAppointments = async () => {
    if (!user) return

    try {
      setIsLoading(true) // Start loading
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: true })

      if (error) throw error

      setAppointments(data as Appointment[])
    } catch (error: any) {
      console.error("Error fetching appointments:", error.message)
    } finally {
      setIsLoading(false) // End loading
    }
  }

  const resetForm = () => {
    setTitle("")
    setDate(new Date())
    setTime("09:00")
    setNotes("")
    setReminder(true)
    setEditingAppointment(null)
  }

  const handleOpenDialog = (appointment?: Appointment) => {
    if (appointment) {
      setTitle(appointment.title)
      setDate(new Date(appointment.date))
      setTime(appointment.time)
      setNotes(appointment.notes || "")
      setReminder(appointment.reminder)
      setEditingAppointment(appointment)
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    resetForm()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      setError("You must be logged in to create an appointment")
      return
    }

    // Input validations
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    if (!notes.trim()) {
      setError("Notes are required.");
      return;
    }

    const now = new Date();
    now.setSeconds(0, 0); // Remove seconds and milliseconds

    const appointmentDateTime = new Date(`${format(date, "yyyy-MM-dd")}T${time}`);

    if (isNaN(appointmentDateTime.getTime())) {
      setError("Invalid date or time.");
      return;
    }

    if (appointmentDateTime < now) {
      setError("Cannot schedule an appointment in the past.");
      return;
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (editingAppointment) {
        // Update existing appointment
        const { error } = await supabase
          .from("appointments")
          .update({
            title,
            date: format(date, "yyyy-MM-dd"),
            time,
            notes,
            reminder,
          })
          .eq("id", editingAppointment.id)

        if (error) throw error

        setSuccess("Appointment updated successfully")

        // Show browser notification if supported and enabled
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Appointment Updated", {
            body: `Your appointment "${title}" has been updated for ${format(date, "MMMM d, yyyy")} at ${time}`,
            icon: "/favicon.ico",
          })
        }
      } else {
        // Create new appointment
        const { error } = await supabase.from("appointments").insert({
          user_id: user.id,
          title,
          date: format(date, "yyyy-MM-dd"),
          time,
          notes,
          reminder,
        })

        if (error) throw error

        setSuccess("Appointment created successfully")

        // Show browser notification if supported and enabled
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("New Appointment Created", {
            body: `Your appointment "${title}" is scheduled for ${format(date, "MMMM d, yyyy")} at ${time}`,
            icon: "/favicon.ico",
          })
        }
      }

      fetchAppointments()
      handleCloseDialog()
    } catch (error: any) {
      setError(error.message || "Failed to save appointment")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!user) return

    try {
      const { error } = await supabase.from("appointments").delete().eq("id", id)

      if (error) throw error

      setAppointments(appointments.filter((appointment) => appointment.id !== id))
      setDeleteConfirmId(null)
    } catch (error: any) {
      console.error("Error deleting appointment:", error.message)
    }
  }

  const searchOBGYNClinics = async () => {
  console.log("🚀 searchOBGYNClinics triggered")

  setIsSearching(true)
  setError(null)
  setClinics([])
  setSuggestions([])

  try {
    console.log("📍 Location input:", locationInput)

    // Step 1: Geocode with Mapbox
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""
    const geoResponse = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        locationInput
      )}.json?access_token=${mapboxToken}`
    )

    console.log("🗺️ Mapbox response status:", geoResponse.status)

    if (!geoResponse.ok) {
      throw new Error("Failed to geocode location")
    }

    const geoData = await geoResponse.json()
    console.log("🗺️ Mapbox data:", geoData)

    const coordinates = geoData.features?.[0]?.center
    console.log("📌 Coordinates:", coordinates)

    if (!coordinates) {
      throw new Error("Location not found")
    }

    const [longitude, latitude] = coordinates
    console.log("📍 Lat/Lng:", { latitude, longitude })

    const categories = selectedCategories.join(",")
    const radius = 5000
    const limit = 10

    console.log("🏷️ Categories:", categories)

    // Step 2: Call backend
    const searchResponse = await fetch(
      `/api/foursquare?ll=${latitude},${longitude}&categories=${categories}&radius=${radius}&limit=${limit}`
    )

    console.log("🏥 API response status:", searchResponse.status)

    if (!searchResponse.ok) {
      throw new Error("Failed to search for clinics")
    }

    const searchData = await searchResponse.json()
    console.log("🏥 Raw API data:", searchData)
    console.log("🔍 searchData.results:", searchData.results)

    // 🔥 THIS is where the crash happens if results is undefined
    const mappedClinics = (searchData.results || []).map((clinic: any) => {
      console.log("➡️ Mapping clinic:", clinic)

      return {
        fsq_id: clinic.fsq_id,
        name: clinic.name,
        location: {
          address: clinic.location?.formatted_address || "",
          locality: clinic.location?.locality || "",
          region: clinic.location?.region || "",
          postcode: clinic.location?.postcode || "",
          country: clinic.location?.country || "",
          formatted_address: clinic.location?.formatted_address || "",
          lat: clinic.latitude,
          lng: clinic.longitude,
        },
        categories: (clinic.categories || []).map((category: any) => ({
          id: category.id,
          name: category.name,
        })),
        tel: clinic.contact?.formatted_phone || "",
        website: clinic.url || "",
        rating: clinic.rating || 0,
      }
    })

    console.log("✅ Mapped clinics:", mappedClinics)
    setClinics(mappedClinics)

  } catch (error: any) {
    console.error("❌ searchOBGYNClinics error:", error)
    setError(error.message)
    setClinics([])
  } finally {
    setIsSearching(false)
    console.log("🏁 searchOBGYNClinics finished")
  }
}



  // Get appointments for the selected date
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd")
  const appointmentsForSelectedDate = appointmentsByDate[selectedDateStr] || []

  // Get dates with appointments for highlighting in the calendar
  const datesWithAppointments = Object.keys(appointmentsByDate).map((dateStr) => new Date(dateStr))

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Appointments</h1>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" /> New Appointment
        </Button>
      </div>


      <Tabs defaultValue="upcoming" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="find">Find Clinics</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Appointments</CardTitle>
                <CardDescription>Your scheduled appointments</CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingAppointments.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingAppointments.map((appointment) => (
                      <div key={appointment.id} className="flex items-start justify-between rounded-md border p-4">
                        <div>
                          <div className="flex items-center">
                            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {format(parseISO(appointment.date), "MMMM d, yyyy")}
                            </span>
                            <Clock className="ml-4 mr-2 h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{appointment.time}</span>
                          </div>
                          <h3 className="mt-1 font-medium">{appointment.title}</h3>
                          {appointment.notes && (
                            <p className="mt-1 text-sm text-muted-foreground">{appointment.notes}</p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button size="icon" variant="ghost" onClick={() => handleOpenDialog(appointment)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteConfirmId(appointment.id)}
                            disabled={deleteConfirmId !== null}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-6 text-muted-foreground">No upcoming appointments scheduled.</p>
                )}
              </CardContent>
            </Card>

            {pastAppointments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Past Appointments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pastAppointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="flex items-start justify-between rounded-md border p-4 opacity-70"
                      >
                        <div>
                          <div className="flex items-center">
                            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {format(parseISO(appointment.date), "MMMM d, yyyy")}
                            </span>
                            <Clock className="ml-4 mr-2 h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{appointment.time}</span>
                          </div>
                          <h3 className="mt-1 font-medium">{appointment.title}</h3>
                          {appointment.notes && (
                            <p className="mt-1 text-sm text-muted-foreground">{appointment.notes}</p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button size="icon" variant="ghost" onClick={() => handleOpenDialog(appointment)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteConfirmId(appointment.id)}
                            disabled={deleteConfirmId !== null}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="calendar">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Calendar View */}
            <Card>
              <CardHeader>
                <CardTitle>Calendar</CardTitle>
                <CardDescription>Select a date to view appointments</CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar 
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border"
                  modifiers={{
                    appointment: datesWithAppointments,
                  }}
                  modifiersStyles={{
                    appointment: {
                      fontWeight: "bold",
                      backgroundColor: "rgba(236, 72, 153, 0.1)",
                      borderRadius: "0",
                    },
                  }}
                />
              </CardContent>
            </Card>

            {/* Appointments for Selected Date */}
            <Card>
              <CardHeader>
                <CardTitle>{format(selectedDate, "MMMM d, yyyy")}</CardTitle>
                <CardDescription>
                  {appointmentsForSelectedDate.length === 0
                    ? "No appointments scheduled"
                    : `${appointmentsForSelectedDate.length} appointment(s) scheduled`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {appointmentsForSelectedDate.length > 0 ? (
                  <div className="space-y-4">
                    {appointmentsForSelectedDate.map((appointment) => (
                      <div key={appointment.id} className="flex items-start justify-between rounded-md border p-4">
                        <div>
                          <div className="flex items-center">
                            <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{appointment.time}</span>
                          </div>
                          <h3 className="mt-1 font-medium">{appointment.title}</h3>
                          {appointment.notes && (
                            <p className="mt-1 text-sm text-muted-foreground">{appointment.notes}</p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button size="icon" variant="ghost" onClick={() => handleOpenDialog(appointment)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteConfirmId(appointment.id)}
                            disabled={deleteConfirmId !== null}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No appointments for this date.</p>
                )}
              </CardContent>
              <CardFooter>
                <Button onClick={() => handleOpenDialog()} className="w-full">
                  <Plus className="mr-2 h-4 w-4" /> Add Appointment
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="find">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Find OBGYN Clinics</CardTitle>
              <CardDescription>Discover nearby OBGYN clinics and hospitals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="Enter a location (e.g. city, address)"
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    {suggestions.length > 0 && (
                      <ul className="absolute z-50 w-full bg-secondary border rounded-lg shadow-lg mt-1 max-h-60 overflow-auto">
                        {suggestions.map((suggestion, index) => (
                          <li
                            key={index}
                            className="p-3 hover:bg-primary cursor-pointer transition-colors"
                            onClick={() => {
                              setLocationInput(suggestion.place_name)
                              setSuggestions([])
                            }}
                          >
                            {suggestion.place_name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <Button
                    onClick={searchOBGYNClinics}
                    disabled={isSearching || !locationInput.trim()}
                    className="w-auto p-3 bg-primary text-white rounded-lg"
                  >
                    {isSearching ? "Searching..." : "Search"}
                    <Search className="ml-2 h-4 w-4" />
                  </Button>
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
              <div>
                <h4 className="font-medium mb-2">Include Categories:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                  {categoryOptions.map((category) => (
                    <label key={category.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        value={category.id}
                        checked={selectedCategories.includes(category.id)}
                        onChange={(e) => {
                          const id = e.target.value
                          setSelectedCategories((prev) =>
                            e.target.checked ? [...prev, id] : prev.filter((catId) => catId !== id),
                          )
                        }}
                        className="accent-primary"
                      />
                      <span className="text-sm">{category.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-medium">
                  {locationInput ? "Nearby OBGYN Clinics" : "Nearby OBGYN Clinics"}
                </h3>

                {isSearching ? (
                  <div className="text-center py-8">
                     <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Searching for OBGYN clinics...</p>
                  </div>
                ) : clinics.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {clinics.map((clinic) => (
                      <Card key={clinic.fsq_id} className="overflow-hidden">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">{clinic.name}</CardTitle>
                          <CardDescription className="flex items-center">
                            <MapPin className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                            {clinic.location.formatted_address ||
                              `${clinic.location.address}, ${clinic.location.locality}`}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pb-2">
                          <div className="flex flex-wrap gap-1 mb-3">
                            {clinic.categories.map((category) => (
                              <Badge key={category.id} variant="secondary" className="text-xs">
                                {category.name}
                              </Badge>
                            ))}
                          </div>
                          <div className="space-y-1 text-sm">
                            {clinic.tel && (
                              <div className="flex items-center">
                                <Phone className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                                <a href={`tel:${clinic.tel}`} className="hover:underline">
                                  {clinic.tel}
                                </a>
                              </div>
                            )}
                          </div>
                        </CardContent>
                        <CardFooter className="pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              const { lat, lng } = clinic.location // Assuming clinic has lat and lng fields
                              const locationUrl = `https://www.google.com/maps?q=${lat},${lng}`
                              window.open(locationUrl, "_blank")
                            }}
                          >
                            <MapPin className="mr-2 h-4 w-4" />
                            Get Directions
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                ) : locationInput ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No OBGYN clinics found in this area.</p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Please enter a location to search for OBGYN clinics.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Appointment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this appointment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirmId) {
                  handleDelete(deleteConfirmId)
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Appointment Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingAppointment ? "Edit Appointment" : "New Appointment"}</DialogTitle>
            <DialogDescription>Create or edit an appointment.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Alert variant="destructive" className={cn("mb-4", error ? "block" : "hidden")}>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Alert className={cn("mb-4", success ? "block" : "hidden")}>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Title
              </Label>
              <Input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "col-span-3 flex justify-start text-left font-normal",
                      !date && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={handleDateSelect} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="time" className="text-right">
                Time
              </Label>
              <Input
                type="time"
                id="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="notes" className="text-right mt-2">
                Notes
              </Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reminder" className="text-right">
                Reminder
              </Label>
              <Switch id="reminder" checked={reminder} onCheckedChange={setReminder} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button type="submit" onClick={handleSubmit} disabled={isLoading}>
              {editingAppointment ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
