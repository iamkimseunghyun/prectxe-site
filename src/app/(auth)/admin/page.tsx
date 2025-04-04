import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Archive,
  Image as ImageIcon,
  MapPin,
  PlusCircle,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import getSession from '@/lib/session';
import { redirect } from 'next/navigation';

const Page = () => {
  const handleLogout = async () => {
    'use server';
    const session = await getSession();
    if (session.id) {
      session.destroy();
    }
    redirect('/');
  };

  return (
    <div className="mx-auto max-w-7xl p-8">
      <h1 className="mb-8 text-4xl font-bold">PRECTXE Admin Dashboard</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Auth Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-6 w-6" />
              Admin
            </CardTitle>
            <CardDescription>
              Manage Admin user and their information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <Link href="/auth/signup">
                <Button className="w-full" variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add New Manager
                </Button>
              </Link>

              <form action={handleLogout}>
                <Button className="w-full" variant="outline">
                  Log Out
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
        {/* Project Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-6 w-6" />
              Projects
            </CardTitle>
            <CardDescription>
              Manage festival project and their information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <Link href="/projects/new">
                <Button className="w-full" variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add New Project
                </Button>
              </Link>

              <Link href="/projects">
                <Button className="w-full" variant="outline">
                  View All Projects
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Artists Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-6 w-6" />
              Artists
            </CardTitle>
            <CardDescription>
              Manage festival artists and their information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <Link href="/artists/new">
                <Button className="w-full" variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add New Artist
                </Button>
              </Link>

              <Link href="/artists">
                <Button className="w-full" variant="outline">
                  View All Artists
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Artworks Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-6 w-6" />
              Artworks
            </CardTitle>
            <CardDescription>
              Manage artwork collections and details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <Link href="/artworks/new">
                <Button className="w-full" variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add New Artwork
                </Button>
              </Link>
              <Link href="/artworks">
                <Button className="w-full" variant="outline">
                  View All Artworks
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Venues Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-6 w-6" />
              Venues
            </CardTitle>
            <CardDescription>
              Manage festival venues and locations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <Link href="/venues/new">
                <Button className="w-full" variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add New Venue
                </Button>
              </Link>
              <Link href="/venues">
                <Button className="w-full" variant="outline">
                  View All Venues
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        {/* Events Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-6 w-6" />
              Events
            </CardTitle>
            <CardDescription>
              Manage festival events and locations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <Link href="/events/new">
                <Button className="w-full" variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add New Events
                </Button>
              </Link>
              <Link href="/events">
                <Button className="w-full" variant="outline">
                  View All Events
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Page;
