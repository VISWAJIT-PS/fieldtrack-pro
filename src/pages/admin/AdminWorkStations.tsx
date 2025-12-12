import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { MapPin, Plus, Search, Pencil, Trash2, Loader2, LocateFixed } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getGoogleMapsLink } from '@/lib/utils';

interface WorkStation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  created_at: string;
}

export default function AdminWorkStations() {
  const [workStations, setWorkStations] = useState<WorkStation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<WorkStation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    latitude: '',
    longitude: '',
  });

  useEffect(() => {
    fetchWorkStations();
  }, []);

  const fetchWorkStations = async () => {
    const { data, error } = await supabase
      .from('work_stations')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setWorkStations(data);
    }
    setIsLoading(false);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Error',
        description: 'Geolocation is not supported by your browser',
        variant: 'destructive',
      });
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData({
          ...formData,
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString(),
        });
        setIsGettingLocation(false);
        toast({
          title: 'Location Captured',
          description: 'Current GPS coordinates have been added.',
        });
      },
      (error) => {
        setIsGettingLocation(false);
        toast({
          title: 'Error',
          description: 'Unable to get your location. Please enable location access.',
          variant: 'destructive',
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const stationData = {
        name: formData.name.trim(),
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
      };

      if (editingStation) {
        const { error } = await supabase
          .from('work_stations')
          .update(stationData)
          .eq('id', editingStation.id);

        if (error) throw error;

        toast({
          title: 'Work Station Updated',
          description: 'Work station has been updated.',
        });
      } else {
        const { error } = await supabase
          .from('work_stations')
          .insert(stationData);

        if (error) throw error;

        toast({
          title: 'Work Station Added',
          description: 'New work station has been added.',
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchWorkStations();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
    }

    setIsSubmitting(false);
  };

  const handleEdit = (station: WorkStation) => {
    setEditingStation(station);
    setFormData({
      name: station.name,
      latitude: station.latitude.toString(),
      longitude: station.longitude.toString(),
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('work_stations').delete().eq('id', id);

      if (error) throw error;

      toast({
        title: 'Work Station Deleted',
        description: 'Work station has been removed.',
      });

      fetchWorkStations();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete work station',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setEditingStation(null);
    setFormData({
      name: '',
      latitude: '',
      longitude: '',
    });
  };

  const filteredStations = workStations.filter((station) =>
    station.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 lg:p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="animate-fade-in">
          <h1 className="flex items-center gap-2 text-2xl font-bold lg:text-3xl">
            <MapPin className="h-6 w-6 text-primary lg:h-7 lg:w-7" />
            Work Stations
          </h1>
          <p className="text-muted-foreground">Manage work locations for employees</p>
        </div>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="gradient-primary">
              <Plus className="mr-2 h-4 w-4" />
              Add Work Station
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingStation ? 'Edit Work Station' : 'Add New Work Station'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Station Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Main Office, Site A"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  GPS Coordinates
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={getCurrentLocation}
                  disabled={isGettingLocation}
                >
                  {isGettingLocation ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LocateFixed className="mr-2 h-4 w-4" />
                  )}
                  Use Current Location
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="latitude" className="text-xs text-muted-foreground">
                      Latitude
                    </Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      placeholder="e.g. 28.6139"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="longitude" className="text-xs text-muted-foreground">
                      Longitude
                    </Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      placeholder="e.g. 77.2090"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingStation ? 'Update' : 'Add'} Station
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm animate-fade-in">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search work stations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Work Stations Table */}
      <Card className="animate-slide-up">
        <CardContent className="p-0">
          {filteredStations.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              {searchQuery ? 'No work stations found' : 'No work stations added yet'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Station Name</TableHead>
                    <TableHead>Latitude</TableHead>
                    <TableHead>Longitude</TableHead>
                    <TableHead>Map</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStations.map((station) => (
                    <TableRow key={station.id}>
                      <TableCell className="font-medium">{station.name}</TableCell>
                      <TableCell>{station.latitude.toFixed(6)}</TableCell>
                      <TableCell>{station.longitude.toFixed(6)}</TableCell>
                      <TableCell>
                        <a
                          href={getGoogleMapsLink({ latitude: station.latitude, longitude: station.longitude }) || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <MapPin className="h-3 w-3" />
                          View
                        </a>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(station)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Work Station</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{station.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(station.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
