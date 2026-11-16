import React, { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Lenis from 'lenis';
import { AuthProvider } from './context/AuthContext';
import { AppShell } from './components/AppShell';
import { HomePage } from './pages/HomePage';
import { ActivitiesPage } from './pages/ActivitiesPage';
import { ActivityDetailPage } from './pages/ActivityDetailPage';
import { ActivityFormPage } from './pages/ActivityFormPage';
import { MyActivitiesPage } from './pages/MyActivitiesPage';
import { PeoplePage, PublicProfilePage } from './pages/PeoplePages';
import { ProfilePage } from './pages/ProfilePage';
import { CommunitiesPage, CommunityDetailPage } from './pages/CommunitiesPages';
import { MessagesPage } from './pages/MessagesPage';
import { AboutPage } from './pages/AboutPage';
import { LoginPage, SignupPage } from './pages/AuthPages';
import { CheckoutPage } from './pages/CheckoutPage';
import { MyTicketsPage } from './pages/MyTicketsPage';
import { OrganiserManagePage } from './pages/OrganiserManagePage';

export default function App() {
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/activities" element={<ActivitiesPage />} />
            <Route path="/activities/new" element={<ActivityFormPage mode="create" />} />
            <Route path="/activities/:id/edit" element={<ActivityFormPage mode="edit" />} />
            <Route path="/activities/:id/manage" element={<OrganiserManagePage />} />
            <Route path="/activities/:id/checkout" element={<CheckoutPage />} />
            <Route path="/events/:id/checkout" element={<CheckoutPage />} />
            <Route path="/activities/:id" element={<ActivityDetailPage />} />
            <Route path="/my-activities" element={<MyActivitiesPage />} />
            <Route path="/tickets" element={<MyTicketsPage />} />
            <Route path="/people" element={<PeoplePage />} />
            <Route path="/people/:id" element={<PublicProfilePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/communities" element={<CommunitiesPage />} />
            <Route path="/communities/:id" element={<CommunityDetailPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </AuthProvider>
    </BrowserRouter>
  );
}
