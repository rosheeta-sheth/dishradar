'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { UtensilsCrossed } from 'lucide-react';
import styles from './Navbar.module.css';

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    const supabaseClient = createClient();
    supabaseClient.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setMenuOpen(false), 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  return (
    <nav className={`${styles.navbar} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>
          <UtensilsCrossed className={styles.logoIcon} size={24} />
          <span className="gradient-text">DishRadar</span>
        </Link>

        <div className={`${styles.links} ${menuOpen ? styles.linksOpen : ''}`}>
          <Link href="/explore" className={`${styles.link} ${pathname === '/explore' ? styles.linkActive : ''}`}>
            Explore
          </Link>
          <Link href="/recipes" className={`${styles.link} ${pathname === '/recipes' ? styles.linkActive : ''}`}>
            Recipes
          </Link>
          <Link href="/saved" className={`${styles.link} ${pathname === '/saved' ? styles.linkActive : ''}`}>
            Saved Places
          </Link>
          {user ? (
            <div className={styles.userArea}>
              <Link href="/profile" className={styles.avatar}>
                {user.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Profile" />
                ) : (
                  <span>{(user.email || 'U')[0].toUpperCase()}</span>
                )}
              </Link>
              <button onClick={handleSignOut} className={`btn btn-ghost btn-sm ${styles.signOutBtn}`}>
                Sign Out
              </button>
            </div>
          ) : (
            <Link href="/login" className="btn btn-primary btn-sm">
              Sign In
            </Link>
          )}
        </div>

        <button className={styles.burger} onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
          <span className={`${styles.burgerLine} ${menuOpen ? styles.burgerOpen1 : ''}`} />
          <span className={`${styles.burgerLine} ${menuOpen ? styles.burgerOpen2 : ''}`} />
          <span className={`${styles.burgerLine} ${menuOpen ? styles.burgerOpen3 : ''}`} />
        </button>
      </div>
    </nav>
  );
}
