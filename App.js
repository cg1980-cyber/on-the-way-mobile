import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, ScrollView,
  StatusBar, SafeAreaView, RefreshControl, Modal, PanResponder, Animated, Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { SwipeListView } from 'react-native-swipe-list-view';

// SECURITY: Import input validation helper
import * as validation from './input-validation-helper';

// SECURITY: Load configuration from environment variables
// These should be set via .env file (development) or EAS secrets (production)
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const RAILWAY_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// SECURITY: Validate that required environment variables are configured
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !RAILWAY_URL) {
  console.error('ERROR: Required environment variables not configured');
  console.error('SUPABASE_URL:', SUPABASE_URL ? 'SET' : 'MISSING');
  console.error('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'SET' : 'MISSING');
  console.error('RAILWAY_URL:', RAILWAY_URL ? 'SET' : 'MISSING');
}

const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// SECURITY: Helper function for authenticated API calls using JWT tokens
async function makeAuthenticatedRequest(endpoint, method = 'GET', body = null) {
  try {
    // Get current session to retrieve JWT token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      throw new Error('Not authenticated. Please login.');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    };

    const options = {
      method,
      headers,
    };

    if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${RAILWAY_URL}${endpoint}`, options);

    if (response.status === 401) {
      // Token expired or invalid
      throw new Error('Session expired. Please login again.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API request failed:', error.message);
    throw error;
  }
}

const colors = {
  primary: '#10b981',
  background: '#0f172a',
  card: '#1e293b',
  border: '#334155',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  error: '#ef4444',
};

const statusColors = {
  'Delivered': '#10b981',
  'Out for Delivery': '#3b82f6',
  'In Transit': '#f59e0b',
  'Label Created': '#94a3b8',
  'Delayed': '#ef4444',
  'Available for Pickup': '#8b5cf6',
};

// Carrier registration instructions. Returns the list with the user's
// personal tracking email interpolated so each user sees the address
// they're actually supposed to register with each carrier. Falls back
// to the generic inbox if the profile hasn't loaded yet.
const getCarriers = (trackingEmail) => {
  const email = trackingEmail || 'packages@onthewayapp.net';
  return [
    {
      id: 'usps',
      name: '📮 USPS Informed Delivery',
      steps: [
        '1. Go to informeddelivery.usps.com',
        '2. Sign up with your email',
        '3. Go to Settings → Notifications',
        `4. Forward to: ${email}`
      ]
    },
    {
      id: 'ups',
      name: '📦 UPS My Choice',
      steps: [
        '1. Go to ups.com/mychoice',
        '2. Create an account',
        `3. Set notification email to: ${email}`,
        '4. Enable delivery notifications'
      ]
    },
    {
      id: 'fedex',
      name: '🚚 FedEx Delivery Manager',
      steps: [
        '1. Go to fedex.com/deliverymanager',
        '2. Sign up for an account',
        `3. Set notification email to: ${email}`,
        '4. Save preferences'
      ]
    }
  ];
};

function HousePathLogo({ size = 56 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <Circle cx={8} cy={42} r={3} fill={colors.primary} opacity="0.25" />
      <Circle cx={16} cy={36} r={3} fill={colors.primary} opacity="0.45" />
      <Circle cx={24} cy={32} r={3} fill={colors.primary} opacity="0.65" />
      <Circle cx={32} cy={28} r={3} fill={colors.primary} opacity="0.85" />
      <Path d="M 36 26 L 42 14 L 48 26" stroke={colors.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Rect x="37" y="26" width="22" height="20" rx="2.5" fill={colors.primary} opacity="0.15" />
      <Rect x="42" y="32" width="8" height="10" rx="1.5" fill={colors.primary} opacity="0.3" />
    </Svg>
  );
}

function Checkbox({ checked, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.checkbox, checked && styles.checkboxChecked]}>
      {checked && <Text style={styles.checkboxText}>✓</Text>}
    </TouchableOpacity>
  );
}

// Build a carrier-specific tracking URL. Falls back to 17track (which auto-
// detects carrier from the number) when we don't have a recognized carrier.
function getTrackingUrl(carrier, trackingNumber) {
  if (!trackingNumber) return null;
  const tn = encodeURIComponent(String(trackingNumber).trim());
  switch ((carrier || '').toLowerCase()) {
    case 'usps':
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${tn}`;
    case 'ups':
      return `https://www.ups.com/track?tracknum=${tn}`;
    case 'fedex':
      return `https://www.fedex.com/fedextrack/?trknbr=${tn}`;
    case 'dhl':
      return `https://www.dhl.com/en/express/tracking.html?AWB=${tn}`;
    default:
      return `https://t.17track.net/en#nums=${tn}`;
  }
}

async function openTrackingLink(pkg) {
  const url = getTrackingUrl(pkg && pkg.carrier, pkg && pkg.tracking_number);
  if (!url) return;
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) await Linking.openURL(url);
  } catch (err) {
    console.error('Open tracking link error:', err);
  }
}

// ─── Delivery date helpers ────────────────────────────────────────────────────
// Carrier emails produce estimated_delivery strings in many formats
// ("Thursday, June 12", "06/12/2026", "2026-06-12", "Jun 12"). Parse what we
// can so the UI can say "Today" / "Tomorrow" / "Thu, Jun 18"; fall back to the
// raw string when we can't.
const MONTH_ABBR = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseDeliveryDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();

  const iso = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);

  const named = s.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i);
  if (named) {
    const monthIdx = MONTH_ABBR.indexOf(named[1].toLowerCase().slice(0, 3));
    const day = parseInt(named[2], 10);
    const now = new Date();
    let year = named[3] ? parseInt(named[3], 10) : now.getFullYear();
    let d = new Date(year, monthIdx, day);
    // No year given and the date looks long past → it means next year.
    if (!named[3] && d < new Date(now.getFullYear(), now.getMonth(), now.getDate() - 60)) {
      d = new Date(year + 1, monthIdx, day);
    }
    return d;
  }

  const slash = s.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (slash) {
    const now = new Date();
    let year = slash[3] ? parseInt(slash[3], 10) : now.getFullYear();
    if (year < 100) year += 2000;
    return new Date(year, parseInt(slash[1], 10) - 1, parseInt(slash[2], 10));
  }

  return null;
}

function humanizeDelivery(raw) {
  const d = parseDeliveryDate(raw);
  if (!d || isNaN(d.getTime())) return raw || '';
  const diff = Math.round((startOfDay(d) - startOfDay(new Date())) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff < 7) return DAY_NAMES[d.getDay()];
  return `${DAY_NAMES[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

// Bucket packages by arrival day for the grouped home list.
const BUCKET_ORDER = ['today', 'tomorrow', 'week', 'later', 'nodate', 'delivered'];
const BUCKET_TITLES = {
  today: 'Arriving today',
  tomorrow: 'Tomorrow',
  week: 'This week',
  later: 'Later',
  nodate: 'No date yet',
  delivered: 'Delivered',
};

function deliveryBucket(item) {
  if ((item.status || '') === 'Delivered') return 'delivered';
  const d = parseDeliveryDate(item.estimated_delivery);
  if (!d || isNaN(d.getTime())) return 'nodate';
  const diff = Math.round((startOfDay(d) - startOfDay(new Date())) / 86400000);
  if (diff <= 0) return 'today'; // due (or overdue) → surface at the top
  if (diff === 1) return 'tomorrow';
  if (diff < 7) return 'week';
  return 'later';
}

function groupPackagesForDisplay(pkgs) {
  const buckets = {};
  pkgs.forEach((p) => {
    const b = deliveryBucket(p);
    (buckets[b] = buckets[b] || []).push(p);
  });
  const rows = [];
  BUCKET_ORDER.forEach((b) => {
    if (buckets[b] && buckets[b].length) {
      rows.push({ _type: 'header', id: `hdr-${b}`, title: BUCKET_TITLES[b] });
      buckets[b].sort((a, z) => {
        const da = parseDeliveryDate(a.estimated_delivery);
        const dz = parseDeliveryDate(z.estimated_delivery);
        return (da ? da.getTime() : Infinity) - (dz ? dz.getTime() : Infinity);
      });
      rows.push(...buckets[b]);
    }
  });
  return rows;
}

// ─── Household member chips ───────────────────────────────────────────────────
const MEMBER_CHIP_COLORS = ['#0e7490', '#7c3aed', '#be185d', '#b45309', '#1d4ed8', '#065f46'];

function memberColor(id) {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return MEMBER_CHIP_COLORS[h % MEMBER_CHIP_COLORS.length];
}

function memberInitials(name) {
  const s = String(name || '?').trim();
  return (s.charAt(0).toUpperCase() + s.charAt(1).toLowerCase()).trim();
}

function SwipeablePackageCard({ item, onPress, onSwipeRight, onSwipeLeft, isArchived = false, isDeleted = false, recipientMember = null, showRecipient = false }) {
  const pan = useRef(new Animated.ValueXY()).current;
  const panResponder = useRef(
    PanResponder.create({
      // Don't claim the touch at the start — that would steal taps from the
      // TouchableOpacity inside. Only claim once the user has actually moved
      // horizontally beyond a small threshold (and is moving more horizontally
      // than vertically, so vertical scrolls still work).
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (e, gestureState) =>
        Math.abs(gestureState.dx) > 5 &&
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderMove: Animated.event([null, { dx: pan.x }], { useNativeDriver: false }),
      onPanResponderRelease: (e, { dx }) => {
        const SWIPE_THRESHOLD = 80;

        if (dx > SWIPE_THRESHOLD) {
          // Swiped right
          onSwipeRight();
        } else if (dx < -SWIPE_THRESHOLD) {
          // Swiped left
          onSwipeLeft();
        }

        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  let rightLabel = 'DELETE';
  let rightActionStyle = styles.backActionDelete;
  if (isDeleted) {
    rightLabel = 'DELETE FOREVER';
    rightActionStyle = styles.backActionDeleteForever;
  }

  return (
    <View style={{ marginHorizontal: 12, marginVertical: 6 }}>
      <View style={styles.rowBack}>
        <View style={styles.backActionArchive}>
          <Text style={styles.arrowText}>→</Text>
          <Text style={styles.backActionLabel}>{isDeleted ? 'RESTORE' : isArchived ? 'RESTORE' : 'ARCHIVE'}</Text>
        </View>
        <View style={rightActionStyle}>
          <Text style={styles.backActionLabel}>{rightLabel}</Text>
          <Text style={styles.arrowText}>←</Text>
        </View>
      </View>
      <Animated.View
        style={[{ transform: [{ translateX: pan.x }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={[styles.packageCard, { overflow: 'hidden' }]}
          onPress={onPress}
          activeOpacity={0.7}
        >
          <View style={[styles.statusEdge, { backgroundColor: statusColors[item.status] || colors.border }]} />
          <View style={styles.packageLeft}>
            {/* Only show fields the user has actually filled in. Hide anything blank. */}
            {item.nickname ? (
              <Text style={styles.packageMerchant} numberOfLines={2}>{item.nickname}</Text>
            ) : null}
            {item.merchant ? (
              <Text
                style={item.nickname ? styles.packageFromSubtle : styles.packageMerchant}
                numberOfLines={2}
              >
                {item.nickname ? `From ${item.merchant}` : item.merchant}
              </Text>
            ) : null}
            <View style={styles.packageMeta}>
              {item.status ? (
                <View style={[styles.statusPill, { backgroundColor: (statusColors[item.status] || colors.textMuted) + '26' }]}>
                  <Text style={[styles.statusPillText, { color: statusColors[item.status] || colors.textMuted }]}>{item.status}</Text>
                </View>
              ) : null}
              <Text style={styles.packageCarrier}>{item.carrier}</Text>
            </View>
            {item.tracking_number ? (
              <TouchableOpacity
                onPress={() => openTrackingLink(item)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={styles.trackingNumberLink}>#{item.tracking_number}</Text>
              </TouchableOpacity>
            ) : null}
            {item.note ? (
              <Text style={styles.notePreview} numberOfLines={2}>📝 {item.note}</Text>
            ) : null}
          </View>
          <View style={styles.packageRight}>
            <View style={styles.packageRightBadges}>
              {Array.isArray(item.hidden_from) && item.hidden_from.length > 0 ? (
                <Text style={styles.giftIndicator}>🎁</Text>
              ) : null}
              {showRecipient && recipientMember ? (
                <View style={[styles.memberChipSmall, { backgroundColor: memberColor(recipientMember.id) }]}>
                  <Text style={styles.memberChipSmallText}>{memberInitials(recipientMember.display_name)}</Text>
                </View>
              ) : null}
            </View>
            {item.estimated_delivery ? (
              <View style={styles.deliveryBadge}>
                <Text style={styles.deliveryBadgeLabel}>ETA</Text>
                <Text style={styles.deliveryBadgeDate}>{humanizeDelivery(item.estimated_delivery)}</Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

export default function App() {
  const [screen, setScreen] = useState('loading');
  const [user, setUser] = useState(null);
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [completedCarriers, setCompletedCarriers] = useState([]);
  const [activeTab, setActiveTab] = useState('home');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showPermanentDeleteConfirm, setShowPermanentDeleteConfirm] = useState(null);
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [resetSending, setResetSending] = useState(false);

  // Household (Pillar 1)
  const [household, setHousehold] = useState(null);
  const [householdMembers, setHouseholdMembers] = useState([]);
  const [myMemberId, setMyMemberId] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [householdLoading, setHouseholdLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviting, setInviting] = useState(false);
  const [memberFilter, setMemberFilter] = useState(null); // null = whole household
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [pendingInvite, setPendingInvite] = useState(null);

  useEffect(() => { checkSession(); }, []);

  useEffect(() => {
    if (activeTab === 'home' && user?.id) {
      autoArchiveExpiredPackages();
    }
  }, [activeTab, user?.id]);

  useEffect(() => {
    if (user?.id) fetchHousehold();
  }, [user?.id]);

  async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUser(session.user);
      // Paint instantly from the local cache while fresh data loads.
      // First honest step toward "local storage where possible" (Pillar 3).
      try {
        const [cp, ch] = await Promise.all([
          AsyncStorage.getItem('cache:packages'),
          AsyncStorage.getItem('cache:household'),
        ]);
        if (cp) setPackages(JSON.parse(cp));
        if (ch) {
          const h = JSON.parse(ch);
          if (h && h.household) {
            setHousehold(h.household);
            setHouseholdMembers(h.members || []);
            setMyMemberId(h.me || null);
            setMyRole(h.myRole || null);
          }
        }
      } catch (e) { /* cache is best-effort */ }
      const trackingEmail = await fetchUserProfile(session.user.id);
      if (trackingEmail) setUser(prev => ({ ...prev, trackingEmail }));
      const completed = await AsyncStorage.getItem('completedCarriers');
      if (completed) setCompletedCarriers(JSON.parse(completed));
      setScreen('home');
      // Add small delay to ensure session is fully available before fetching packages
      setTimeout(() => {
        fetchPackages(session.user.id);
      }, 100);
    } else {
      setScreen('auth');
    }
  }

  async function fetchUserProfile(userId) {
    try {
      // SECURITY: Use JWT authentication instead of X-User-ID
      const data = await makeAuthenticatedRequest('/api/auth/profile', 'GET');
      return data.tracking_email;
    } catch (err) {
      console.error('Fetch profile error:', err);
      return null;
    }
  }

  async function toggleCarrierComplete(carrierId) {
    let updated = [...completedCarriers];
    if (updated.includes(carrierId)) {
      updated = updated.filter(id => id !== carrierId);
    } else {
      updated.push(carrierId);
    }
    setCompletedCarriers(updated);
    await AsyncStorage.setItem('completedCarriers', JSON.stringify(updated));
  }

  async function handleSignUp() {
    if (!email || !password) { Alert.alert('Error', 'Please enter your email and password'); return; }
    setLoading(true);
    try {
      // SECURITY: Validate email and password format
      const validatedEmail = validation.validateEmail(email);
      const passwordValidation = validation.validatePassword(password);

      if (!passwordValidation.isValid) {
        Alert.alert('Password Error', passwordValidation.errors.join('\n'));
        setLoading(false);
        return;
      }

      const res = await fetch(RAILWAY_URL + '/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: validatedEmail, password, address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // SECURITY: Clear old AsyncStorage data to prevent conflicts with new JWT authentication
      await AsyncStorage.removeItem('SUPABASE_SESSION');

      setUser(authData.user);
      const trackingEmail = await fetchUserProfile(authData.user.id);
      if (trackingEmail) setUser(prev => ({ ...prev, trackingEmail }));
      setScreen('home');
      fetchPackages(authData.user.id);
    } catch (err) {
      Alert.alert('Sign Up Failed', err.message);
    } finally { setLoading(false); }
  }

  async function handleLogin() {
    if (!email || !password) { Alert.alert('Error', 'Please enter your email and password'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // SECURITY: Clear old AsyncStorage data to prevent conflicts with new JWT authentication
      await AsyncStorage.removeItem('SUPABASE_SESSION');

      setUser(data.user);
      const trackingEmail = await fetchUserProfile(data.user.id);
      if (trackingEmail) setUser(prev => ({ ...prev, trackingEmail }));
      setScreen('home');
      fetchPackages(data.user.id);
      const completed = await AsyncStorage.getItem('completedCarriers');
      if (completed) setCompletedCarriers(JSON.parse(completed));
    } catch (err) {
      Alert.alert('Login Failed', err.message);
    } finally { setLoading(false); }
  }

  async function handleForgotPassword() {
    if (!email) {
      Alert.alert('Email required', 'Enter the email address you signed up with, then tap "Forgot password?" again.');
      return;
    }
    let validatedEmail;
    try {
      validatedEmail = validation.validateEmail(email);
    } catch (err) {
      Alert.alert('Invalid email', err.message || 'Please enter a valid email address.');
      return;
    }
    setResetSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(validatedEmail);
      if (error) throw error;
      Alert.alert(
        'Check your email',
        `If an account exists for ${validatedEmail}, a password reset link is on its way. Open the link from your phone to set a new password, then come back here to log in.`
      );
    } catch (err) {
      // Don't leak whether the email exists; show a generic success-style message
      Alert.alert(
        'Check your email',
        `If an account exists for ${validatedEmail}, a password reset link is on its way.`
      );
    } finally {
      setResetSending(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    await AsyncStorage.multiRemove(['cache:packages', 'cache:household']).catch(() => {});
    setUser(null);
    setPackages([]);
    setCompletedCarriers([]);
    setHousehold(null);
    setHouseholdMembers([]);
    setMyMemberId(null);
    setMyRole(null);
    setMemberFilter(null);
    setPendingInvite(null);
    setScreen('auth');
  }

  async function confirmDeleteAccount() {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your account, your packages, and your household membership. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Are you sure?', 'Last chance — everything will be permanently removed.', [
              { text: 'Keep my account', style: 'cancel' },
              {
                text: 'Delete everything',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await makeAuthenticatedRequest('/api/auth/account', 'DELETE');
                  } catch (err) {
                    Alert.alert('Error', err.message);
                    return;
                  }
                  await handleSignOut();
                },
              },
            ]);
          },
        },
      ]
    );
  }

  async function fetchPackages(userId) {
    try {
      // SECURITY: Use JWT authentication instead of X-User-ID header
      const data = await makeAuthenticatedRequest('/api/packages', 'GET');
      setPackages(Array.isArray(data) ? data : []);
      AsyncStorage.setItem('cache:packages', JSON.stringify(data)).catch(() => {});
    } catch (err) {
      console.error('Fetch packages error:', err);
      if (err.message.includes('not authenticated')) {
        Alert.alert('Session Expired', 'Please login again.');
      }
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    // Ask the backend to refresh live carrier statuses first (EasyPost).
    // Harmless no-op until the API key is configured server-side.
    try { await makeAuthenticatedRequest('/api/refresh-status', 'POST'); } catch (e) { /* optional */ }
    await fetchPackages(user?.id);
    setRefreshing(false);
  }

  // ─── Household (Pillar 1) ──────────────────────────────────────────────────
  async function fetchHousehold() {
    try {
      setHouseholdLoading(true);
      const data = await makeAuthenticatedRequest('/api/household', 'GET');
      setHousehold(data.household);
      setHouseholdMembers(Array.isArray(data.members) ? data.members : []);
      setMyMemberId(data.me || null);
      setMyRole(data.myRole || null);
      AsyncStorage.setItem('cache:household', JSON.stringify(data)).catch(() => {});
    } catch (err) {
      // 404 = user has no household yet (older account); not an error worth alerting.
      if (!String(err.message).includes('No household')) {
        console.error('Fetch household error:', err);
      }
      setHousehold(null);
      setHouseholdMembers([]);
    } finally {
      setHouseholdLoading(false);
    }
    // Separately, check whether an invite is waiting for this email address.
    try {
      const inv = await makeAuthenticatedRequest('/api/household/my-invite', 'GET');
      setPendingInvite(inv && inv.invite ? inv.invite : null);
    } catch (e) {
      setPendingInvite(null);
    }
  }

  async function acceptInviteToken(token) {
    try {
      setJoining(true);
      await makeAuthenticatedRequest('/api/household/accept', 'POST', { token });
      setPendingInvite(null);
      await fetchHousehold();
      await fetchPackages(user?.id);
      Alert.alert('Joined!', 'Welcome to the household — your shared package feed is ready.');
    } catch (err) {
      Alert.alert('Could not join', err.message);
    } finally {
      setJoining(false);
    }
  }

  async function renameHousehold(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    try {
      const updated = await makeAuthenticatedRequest('/api/household', 'PATCH', { name: trimmed });
      setHousehold(updated);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }

  async function inviteMember() {
    const email = inviteEmail.trim().toLowerCase();
    const name = inviteName.trim();
    if (!email || !email.includes('@')) {
      Alert.alert('Invalid email', 'Enter a valid email address.');
      return;
    }
    if (!name) {
      Alert.alert('Name required', 'Enter a display name for this person.');
      return;
    }
    try {
      setInviting(true);
      const res = await makeAuthenticatedRequest('/api/household/invite', 'POST', {
        email,
        display_name: name,
      });
      setInviteEmail('');
      setInviteName('');
      await fetchHousehold();
      Alert.alert(
        'Invite sent',
        res.email_sent
          ? `An invitation was emailed to ${email}.`
          : `${name} was added as pending. Email isn't configured yet, so share this link:\n\n${res.accept_url}`
      );
    } catch (err) {
      Alert.alert('Could not invite', err.message);
    } finally {
      setInviting(false);
    }
  }

  async function acceptInvite() {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) {
      Alert.alert('Enter your code', 'Type the invite code from your email.');
      return;
    }
    try {
      setJoining(true);
      await makeAuthenticatedRequest('/api/household/accept', 'POST', { code });
      setJoinCode('');
      await fetchHousehold();
      await fetchPackages(user?.id);
      Alert.alert('Joined!', 'You\'re now part of the household. Your shared package feed is ready.');
    } catch (err) {
      Alert.alert('Could not join', err.message);
    } finally {
      setJoining(false);
    }
  }

  async function removeMember(member) {
    const isSelf = member.id === myMemberId;
    Alert.alert(
      isSelf ? 'Leave household?' : `Remove ${member.display_name}?`,
      isSelf
        ? 'You will stop seeing this household\'s shared packages.'
        : `${member.display_name} will be removed from the household.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isSelf ? 'Leave' : 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await makeAuthenticatedRequest(`/api/household/members/${member.id}`, 'DELETE');
              await fetchHousehold();
              if (isSelf) setScreen('settings');
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  }

  async function updateNickname(pkg, nickname) {
    try {
      // SECURITY: Validate nickname before sending
      const validatedNickname = validation.validateNickname(nickname);

      // SECURITY: Use JWT authentication
      await makeAuthenticatedRequest(
        `/api/packages/${pkg.id}`,
        'PATCH',
        { nickname: validatedNickname }
      );
      fetchPackages(user.id);
    } catch (err) {
      console.error('Update error:', err);
      Alert.alert('Error', err.message);
    }
  }

  async function updateMerchant(pkg, merchant) {
    try {
      // Client-side sanitization: strip control chars, trim, cap length
      const cleaned = (merchant || '')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .trim()
        .slice(0, 120);
      // Skip if unchanged
      if ((pkg.merchant || '') === cleaned) return;
      await makeAuthenticatedRequest(
        `/api/packages/${pkg.id}`,
        'PATCH',
        { merchant: cleaned }
      );
      fetchPackages(user.id);
    } catch (err) {
      console.error('Update merchant error:', err);
      Alert.alert('Error', err.message);
    }
  }

  async function updateNote(pkg, note) {
    try {
      // Client-side validation: max 280 chars, strip control chars
      const cleaned = (note || '')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .trim();
      if (cleaned.length > 280) {
        Alert.alert('Error', 'Note too long (maximum 280 characters)');
        return;
      }
      // Skip if unchanged
      if ((pkg.note || '') === cleaned) return;
      // SECURITY: Use JWT authentication
      await makeAuthenticatedRequest(
        `/api/packages/${pkg.id}`,
        'PATCH',
        { note: cleaned }
      );
      fetchPackages(user.id);
    } catch (err) {
      console.error('Update note error:', err);
      Alert.alert('Error', err.message);
    }
  }

  // Assign who a package is for (household recipient)
  async function updateRecipient(pkg, memberId) {
    try {
      const next = pkg.recipient_member_id === memberId ? null : memberId;
      await makeAuthenticatedRequest(`/api/packages/${pkg.id}`, 'PATCH', {
        recipient_member_id: next,
      });
      setSelectedPackage((prev) => (prev ? { ...prev, recipient_member_id: next } : prev));
      fetchPackages(user.id);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }

  // Gift mode — toggle whether a package is hidden from a given member
  async function toggleHiddenFrom(pkg, memberId) {
    try {
      const current = Array.isArray(pkg.hidden_from) ? pkg.hidden_from : [];
      const next = current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId];
      await makeAuthenticatedRequest(`/api/packages/${pkg.id}`, 'PATCH', {
        hidden_from: next,
      });
      setSelectedPackage((prev) => (prev ? { ...prev, hidden_from: next } : prev));
      fetchPackages(user.id);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }

  async function archivePackage(pkg) {
    try {
      // SECURITY: Use JWT authentication
      await makeAuthenticatedRequest(
        `/api/packages/${pkg.id}`,
        'PATCH',
        { archived: true }
      );
      fetchPackages(user.id);
    } catch (err) {
      console.error('Archive error:', err);
      Alert.alert('Error', err.message);
    }
  }

  async function unarchivePackage(pkg) {
    try {
      // SECURITY: Use JWT authentication
      await makeAuthenticatedRequest(
        `/api/packages/${pkg.id}`,
        'PATCH',
        { archived: false }
      );
      fetchPackages(user.id);
    } catch (err) {
      console.error('Unarchive error:', err);
      Alert.alert('Error', err.message);
    }
  }

  async function moveToDeleted(pkg) {
    try {
      // SECURITY: Use JWT authentication
      const data = await makeAuthenticatedRequest(
        `/api/packages/${pkg.id}`,
        'PATCH',
        { deleted: true }
      );
      console.log('Move to deleted response:', data);
      fetchPackages(user.id);
    } catch (err) {
      console.error('Move to deleted error:', err);
      Alert.alert('Error', err.message);
    }
  }

  async function restoreFromDeleted(pkg) {
    try {
      // SECURITY: Use JWT authentication
      const data = await makeAuthenticatedRequest(
        `/api/packages/${pkg.id}`,
        'PATCH',
        { deleted: false }
      );
      console.log('Restore from deleted response:', data);
      fetchPackages(user.id);
    } catch (err) {
      console.error('Restore from deleted error:', err);
      Alert.alert('Error', err.message);
    }
  }

  async function deletePackage(pkg) {
    try {
      // SECURITY: Use JWT authentication
      await makeAuthenticatedRequest(
        `/api/packages/${pkg.id}`,
        'DELETE'
      );
      fetchPackages(user.id);
    } catch (err) {
      console.error('Delete error:', err);
      Alert.alert('Error', err.message);
    }
  }

  function isDeliveryDatePassed(dateStr) {
    if (!dateStr) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Try parsing common date formats
    const lowerStr = dateStr.toLowerCase().trim();

    // Format: "Wednesday, April 1, 2026"
    const match1 = dateStr.match(/(\w+),\s+(\w+)\s+(\d+),\s+(\d{4})/);
    if (match1) {
      const deliveryDate = new Date(match1[2] + ' ' + match1[3] + ', ' + match1[4]);
      deliveryDate.setHours(0, 0, 0, 0);
      return deliveryDate < today;
    }

    // Format: "Wed 4/08/2026"
    const match2 = dateStr.match(/\d+\/\d+\/\d{4}/);
    if (match2) {
      const deliveryDate = new Date(match2[0]);
      deliveryDate.setHours(0, 0, 0, 0);
      return deliveryDate < today;
    }

    // Format: "Tuesday 03/31/2026"
    const match3 = dateStr.match(/(\w+)\s+(\d+)\/(\d+)\/(\d{4})/);
    if (match3) {
      const deliveryDate = new Date(match3[2] + '/' + match3[3] + '/' + match3[4]);
      deliveryDate.setHours(0, 0, 0, 0);
      return deliveryDate < today;
    }

    return false;
  }

  async function autoArchiveExpiredPackages() {
    if (!user?.id) return;

    const toArchive = packages.filter(p =>
      !p.archived &&
      p.estimated_delivery &&
      isDeliveryDatePassed(p.estimated_delivery)
    );

    for (const pkg of toArchive) {
      try {
        // SECURITY: Use JWT authentication
        await makeAuthenticatedRequest(
          `/api/packages/${pkg.id}`,
          'PATCH',
          { archived: true }
        );
      } catch (err) {
        console.error('Auto-archive error:', err);
      }
    }

    if (toArchive.length > 0) {
      await fetchPackages(user.id);
    }
  }

  function extractMonth(dateStr) {
    if (!dateStr) return 'unknown';
    const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
    const lower = dateStr.trim().toLowerCase();
    for (const m of months) {
      if (lower.includes(m)) return m;
    }
    return lower;
  }

  function deduplicatePackages(pkgs, state = 'active') {
    let filtered;
    if (state === 'active') {
      filtered = pkgs.filter(p => !p.archived && !p.deleted);
    } else if (state === 'archive') {
      filtered = pkgs.filter(p => p.archived && !p.deleted);
    } else if (state === 'deleted') {
      filtered = pkgs.filter(p => p.deleted);
    }
    const seen = {};

    filtered.forEach(pkg => {
      const carrier = (pkg.carrier || '').trim().toLowerCase();
      const month = extractMonth(pkg.estimated_delivery);
      const key = `${carrier}||${month}`;

      if (!seen[key]) {
        seen[key] = { ...pkg };
      } else {
        const current = seen[key];
        // Merge: keep tracking number from whichever has one
        if (pkg.tracking_number && !current.tracking_number) {
          seen[key] = { ...pkg,
            estimated_delivery: (pkg.estimated_delivery || '').length >= (current.estimated_delivery || '').length
              ? pkg.estimated_delivery : current.estimated_delivery
          };
        } else if (!pkg.tracking_number && current.tracking_number) {
          // Current already has tracking — just update delivery date if this one is more specific
          if ((pkg.estimated_delivery || '').length > (current.estimated_delivery || '').length) {
            seen[key] = { ...current, estimated_delivery: pkg.estimated_delivery };
          }
        } else {
          // Both have or both lack tracking — keep latest updated, prefer longer date
          if (new Date(pkg.last_updated) > new Date(current.last_updated)) {
            seen[key] = { ...pkg,
              estimated_delivery: (pkg.estimated_delivery || '').length >= (current.estimated_delivery || '').length
                ? pkg.estimated_delivery : current.estimated_delivery
            };
          }
        }
      }
    });

    return Object.values(seen);
  }

  function PackageCard({ item, onPress }) {
    const statusColor = statusColors[item.status] || colors.textMuted;
    return (
      <TouchableOpacity
        style={styles.packageCard}
        onPress={onPress}
      >
        <View style={styles.packageLeft}>
          <Text style={styles.packageMerchant}>{item.nickname || item.merchant}</Text>
          <View style={styles.packageMeta}>
            <Text style={styles.packageCarrier}>{item.carrier}</Text>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          </View>
          {item.tracking_number && <Text style={styles.trackingNumberText}>#{item.tracking_number}</Text>}
        </View>
        {item.estimated_delivery && (
          <View style={styles.deliveryBadge}>
            <Text style={styles.deliveryBadgeLabel}>ETA</Text>
            <Text style={styles.deliveryBadgeDate}>{item.estimated_delivery}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  function HiddenActionsHome({ item, onDelete, onArchive }) {
    return (
      <View style={styles.rowBack}>
        <TouchableOpacity
          style={styles.backActionArchive}
          onPress={() => onArchive(item)}
          activeOpacity={0.8}
        >
          <Text style={styles.arrowText}>→</Text>
          <Text style={styles.backActionLabel}>ARCHIVE</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backActionDelete}
          onPress={() => onDelete(item)}
          activeOpacity={0.8}
        >
          <Text style={styles.backActionLabel}>DELETE</Text>
          <Text style={styles.arrowText}>←</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function HiddenActionsArchive({ item, onDelete, onUnarchive }) {
    return (
      <View style={styles.rowBack}>
        <TouchableOpacity
          style={styles.backActionArchive}
          onPress={() => onUnarchive(item)}
          activeOpacity={0.8}
        >
          <Text style={styles.arrowText}>→</Text>
          <Text style={styles.backActionLabel}>RESTORE</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backActionDelete}
          onPress={() => onDelete(item)}
          activeOpacity={0.8}
        >
          <Text style={styles.backActionLabel}>DELETE</Text>
          <Text style={styles.arrowText}>←</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (screen === 'loading') {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (screen === 'auth') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <ScrollView contentContainerStyle={styles.authContainer}>
          <View style={styles.logoContainer}>
            <HousePathLogo size={72} />
            <Text style={styles.logoText}>On the Way</Text>
            <Text style={styles.logoSubtext}>Package tracking, simplified.</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.authTabs}>
              <TouchableOpacity style={[styles.authTab, authMode === 'login' && styles.authTabActive]} onPress={() => setAuthMode('login')}>
                <Text style={[styles.authTabText, authMode === 'login' && styles.authTabTextActive]}>Log In</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.authTab, authMode === 'signup' && styles.authTabActive]} onPress={() => setAuthMode('signup')}>
                <Text style={[styles.authTabText, authMode === 'signup' && styles.authTabTextActive]}>Sign Up</Text>
              </TouchableOpacity>
            </View>
            <TextInput style={styles.input} placeholder="Email address" placeholderTextColor={colors.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <TextInput style={styles.input} placeholder="Password" placeholderTextColor={colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry />
            {authMode === 'signup' && (
              <TextInput style={styles.input} placeholder="Home address (optional)" placeholderTextColor={colors.textMuted} value={address} onChangeText={setAddress} />
            )}
            <TouchableOpacity style={styles.button} onPress={authMode === 'login' ? handleLogin : handleSignUp} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{authMode === 'login' ? 'Log In' : 'Create Account'}</Text>}
            </TouchableOpacity>
            {authMode === 'login' && (
              <View style={styles.authHelpRow}>
                <TouchableOpacity onPress={handleForgotPassword} disabled={resetSending}>
                  <Text style={styles.authLinkText}>
                    {resetSending ? 'Sending...' : 'Forgot password?'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setHelpModalVisible(true)}>
                  <Text style={styles.authLinkSubtle}>Trouble signing in?</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
        <Modal
          visible={helpModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setHelpModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.helpModalCard}>
              <Text style={styles.helpModalTitle}>Trouble signing in?</Text>
              <Text style={styles.helpModalBody}>
                On the Way uses your email address as your login. If you don't remember which email you signed up with, search your inbox for a welcome message from On the Way.
              </Text>
              <Text style={styles.helpModalBody}>
                Still stuck? Contact support and we'll help you get back in.
              </Text>
              <TouchableOpacity
                style={styles.helpModalLinkButton}
                onPress={() => Linking.openURL('mailto:support@onthewayapp.net?subject=Trouble%20signing%20in')}
              >
                <Text style={styles.helpModalLinkText}>support@onthewayapp.net</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.helpModalCloseButton}
                onPress={() => setHelpModalVisible(false)}
              >
                <Text style={styles.helpModalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  if (screen === 'detail' && selectedPackage) {
    const pkg = selectedPackage;
    const statusColor = statusColors[pkg.status] || colors.textMuted;
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setScreen('home')} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Package Details</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.merchantName}>{pkg.nickname || pkg.merchant}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{pkg.status}</Text>
            </View>
            {pkg.estimated_delivery && (
              <View style={styles.deliveryDateBox}>
                <Text style={styles.deliveryDateLabel}>EXPECTED DELIVERY</Text>
                <Text style={styles.deliveryDateValue}>{humanizeDelivery(pkg.estimated_delivery)}</Text>
              </View>
            )}
          </View>
          <View style={styles.card}>
            <Text style={styles.detailLabel}>Carrier</Text>
            <Text style={styles.detailValue}>{pkg.carrier}</Text>
            {pkg.tracking_number && (
              <>
                <Text style={styles.detailLabel}>Tracking Number</Text>
                <TouchableOpacity
                  onPress={() => openTrackingLink(pkg)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={styles.detailValueLink}>{pkg.tracking_number} →</Text>
                </TouchableOpacity>
              </>
            )}
            <Text style={styles.detailLabel}>Last Updated</Text>
            <Text style={styles.detailValue}>{new Date(pkg.last_updated).toLocaleString()}</Text>
          </View>
          {pkg.deleted ? (
            <View style={styles.card}>
              <Text style={styles.restoreToEditTitle}>📦 Restore to edit</Text>
              <Text style={styles.restoreToEditBody}>
                This package is in the Deleted list, so its details can't be edited.
                Swipe right on the card in the Deleted tab to restore it, then come
                back here to update what it is, who it came from, or its reference note.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.card}>
                <Text style={styles.detailLabel}>What it is</Text>
                <TextInput
                  key={`nickname-${pkg.id}-${pkg.nickname || ''}`}
                  style={styles.input}
                  placeholder="e.g. Birthday gift, New shoes..."
                  placeholderTextColor={colors.textMuted}
                  defaultValue={pkg.nickname || ''}
                  onEndEditing={(e) => updateNickname(pkg, e.nativeEvent.text)}
                />
              </View>
              <View style={styles.card}>
                <Text style={styles.detailLabel}>Who it came from</Text>
                <TextInput
                  key={`merchant-${pkg.id}-${pkg.merchant || ''}`}
                  style={styles.input}
                  placeholder="e.g. Amazon, Chewy, Target..."
                  placeholderTextColor={colors.textMuted}
                  defaultValue={pkg.merchant || ''}
                  maxLength={120}
                  onEndEditing={(e) => updateMerchant(pkg, e.nativeEvent.text)}
                />
              </View>
              <View style={styles.card}>
                <Text style={styles.detailLabel}>Reference Note</Text>
                <TextInput
                  key={`note-${pkg.id}-${pkg.note || ''}`}
                  style={styles.input}
                  placeholder="Add a note..."
                  placeholderTextColor={colors.textMuted}
                  defaultValue={pkg.note || ''}
                  maxLength={280}
                  onEndEditing={(e) => updateNote(pkg, e.nativeEvent.text)}
                />
              </View>
              {householdMembers.filter((m) => m.user_id).length > 1 && (
                <>
                  <View style={styles.card}>
                    <Text style={styles.detailLabel}>Who it's for</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                      {householdMembers.filter((m) => m.user_id).map((m) => (
                        <TouchableOpacity
                          key={m.id}
                          style={[styles.chip, { marginBottom: 8 }, pkg.recipient_member_id === m.id && styles.chipActive]}
                          onPress={() => updateRecipient(pkg, m.id)}
                        >
                          <Text style={[styles.chipText, pkg.recipient_member_id === m.id && styles.chipTextActive]}>
                            {m.display_name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.card}>
                    <Text style={styles.detailLabel}>🎁 Gift mode</Text>
                    <Text style={[styles.detailLabel, { color: colors.textMuted, fontSize: 11, marginTop: 2 }]}>
                      Hide this package from someone so a surprise stays secret.
                    </Text>
                    {householdMembers.filter((m) => m.user_id && m.id !== myMemberId).map((m) => {
                      const hidden = Array.isArray(pkg.hidden_from) && pkg.hidden_from.includes(m.id);
                      return (
                        <View
                          key={m.id}
                          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}
                        >
                          <Text style={styles.detailValue}>Hide from {m.display_name}</Text>
                          <Checkbox checked={hidden} onPress={() => toggleHiddenFrom(pkg, m.id)} />
                        </View>
                      );
                    })}
                  </View>
                </>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'instructions') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setScreen('settings')} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Carrier Setup</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView style={styles.content}>
          {user?.trackingEmail && (
            <View style={styles.trackingEmailBox}>
              <Text style={styles.trackingEmailLabel}>Your tracking email:</Text>
              <Text style={styles.trackingEmailValue}>{user.trackingEmail}</Text>
              <Text style={styles.trackingEmailHint}>Use this when registering with carriers</Text>
            </View>
          )}
          <View style={styles.carrierSection}>
            <Text style={styles.carrierTitle}>Registration Instructions</Text>
            {getCarriers(user?.trackingEmail).map(carrier => (
              <View key={carrier.id} style={styles.carrierCard}>
                <Text style={styles.carrierName}>{carrier.name}</Text>
                {carrier.steps.map((step, idx) => (
                  <Text key={idx} style={styles.carrierStep}>{step}</Text>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'settings') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setScreen('home')} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.detailLabel}>Signed in as</Text>
            <Text style={styles.detailValue}>{user?.email}</Text>
          </View>
          {user?.trackingEmail && (
            <View style={styles.card}>
              <Text style={styles.detailLabel}>Your tracking email</Text>
              <Text style={[styles.detailValue, { fontFamily: 'monospace', fontSize: 12 }]}>{user.trackingEmail}</Text>
              <Text style={[styles.detailLabel, { marginTop: 8, color: colors.textMuted, fontSize: 11 }]}>Use this when registering with carriers</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.card}
            onPress={() => { fetchHousehold(); setScreen('household'); }}
          >
            <Text style={styles.detailLabel}>Household</Text>
            <Text style={styles.detailValue}>
              {household ? household.name : 'Set up your household'}
            </Text>
            <Text style={[styles.detailLabel, { marginTop: 4, color: colors.textMuted, fontSize: 11 }]}>
              {household
                ? `${householdMembers.length} member${householdMembers.length === 1 ? '' : 's'} · tap to manage`
                : 'Share a package feed with the people you live with'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => setScreen('instructions')}>
            <Text style={styles.buttonText}>View Carrier Setup Instructions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.buttonDanger, { marginTop: 12 }]} onPress={handleSignOut}>
            <Text style={styles.buttonText}>Sign Out</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteAccountLink} onPress={confirmDeleteAccount}>
            <Text style={styles.deleteAccountText}>Delete my account and data</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'household') {
    const isOwner = myRole === 'owner';
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setScreen('settings')} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Household</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView style={styles.content}>
          {pendingInvite && (
            <View style={styles.inviteBanner}>
              <Text style={styles.inviteBannerTitle}>
                📬 You're invited to {pendingInvite.household_name || 'a household'}
              </Text>
              <Text style={styles.inviteBannerBody}>
                Join to share one package feed with your household.
              </Text>
              <TouchableOpacity
                style={[styles.button, { marginTop: 10 }]}
                onPress={() => acceptInviteToken(pendingInvite.token)}
                disabled={joining}
              >
                <Text style={styles.buttonText}>{joining ? 'Joining…' : 'Join Household'}</Text>
              </TouchableOpacity>
            </View>
          )}
          {householdLoading && !household ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
          ) : !household ? (
            <View style={styles.card}>
              <Text style={styles.detailValue}>No household found</Text>
              <Text style={[styles.detailLabel, { marginTop: 6, color: colors.textMuted }]}>
                Pull to refresh on the package list, or sign out and back in to set one up.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.card}>
                <Text style={styles.detailLabel}>Household name</Text>
                {isOwner ? (
                  <TextInput
                    style={[styles.input, { marginTop: 6 }]}
                    defaultValue={household.name}
                    placeholderTextColor={colors.textMuted}
                    returnKeyType="done"
                    onEndEditing={(e) => renameHousehold(e.nativeEvent.text)}
                  />
                ) : (
                  <Text style={styles.detailValue}>{household.name}</Text>
                )}
              </View>

              <Text style={[styles.detailLabel, { marginTop: 16, marginBottom: 4, marginLeft: 4 }]}>
                MEMBERS ({householdMembers.length})
              </Text>
              {householdMembers.map((m) => {
                const pending = !m.user_id;
                const isSelf = m.id === myMemberId;
                return (
                  <View key={m.id} style={styles.card}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.detailValue}>
                          {m.display_name}{isSelf ? ' (you)' : ''}
                        </Text>
                        <Text style={[styles.detailLabel, { marginTop: 2, color: colors.textMuted, fontSize: 11 }]}>
                          {m.role === 'owner' ? '👑 Owner' : 'Member'}
                          {pending ? ` · invite pending (${m.invite_email})` : ''}
                        </Text>
                      </View>
                      {(isSelf || (isOwner && !isSelf)) && (
                        <TouchableOpacity onPress={() => removeMember(m)}>
                          <Text style={{ color: colors.error, fontWeight: '600', paddingLeft: 12 }}>
                            {isSelf ? 'Leave' : 'Remove'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}

              {isOwner && (
                <View style={[styles.card, { marginTop: 16 }]}>
                  <Text style={styles.detailLabel}>Invite someone</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Their name (e.g. Cory)"
                    placeholderTextColor={colors.textMuted}
                    value={inviteName}
                    onChangeText={setInviteName}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Their email"
                    placeholderTextColor={colors.textMuted}
                    value={inviteEmail}
                    onChangeText={setInviteEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={[styles.button, { marginTop: 12 }]}
                    onPress={inviteMember}
                    disabled={inviting}
                  >
                    <Text style={styles.buttonText}>{inviting ? 'Sending…' : 'Send Invite'}</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={[styles.card, { marginTop: 16 }]}>
                <Text style={styles.detailLabel}>Have an invite code?</Text>
                <Text style={[styles.detailLabel, { color: colors.textMuted, fontSize: 11, marginTop: 2 }]}>
                  Enter a code someone emailed you to join their household.
                </Text>
                <TextInput
                  style={[styles.input, { letterSpacing: 4, fontFamily: 'monospace' }]}
                  placeholder="ABC123"
                  placeholderTextColor={colors.textMuted}
                  value={joinCode}
                  onChangeText={setJoinCode}
                  autoCapitalize="characters"
                  maxLength={8}
                />
                <TouchableOpacity
                  style={[styles.button, { marginTop: 12 }]}
                  onPress={acceptInvite}
                  disabled={joining}
                >
                  <Text style={styles.buttonText}>{joining ? 'Joining…' : 'Join Household'}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  const activePackages = deduplicatePackages(packages, 'active');
  const archivedPackages = deduplicatePackages(packages, 'archive');
  const deletedPackages = deduplicatePackages(packages, 'deleted');

  // Per-member filter chips (only meaningful with >1 joined household member)
  const joinedMembers = householdMembers.filter((m) => m.user_id);
  const showMemberChips = householdMembers.length > 1;
  const visibleActivePackages = memberFilter
    ? activePackages.filter((p) => p.recipient_member_id === memberFilter)
    : activePackages;
  const activeRows = groupPackagesForDisplay(visibleActivePackages);
  const memberById = {};
  householdMembers.forEach((m) => { memberById[m.id] = m; });

  return (
    <>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={styles.header}>
          <View style={styles.headerLogoContainer}>
            <HousePathLogo size={28} />
            <Text style={styles.headerLogoText}>On the Way (Beta)</Text>
          </View>
          <TouchableOpacity onPress={() => setScreen('settings')}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'home' && styles.tabActive]}
            onPress={() => setActiveTab('home')}
          >
            <Text style={[styles.tabText, activeTab === 'home' && styles.tabTextActive]}>Active ({activePackages.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'archive' && styles.tabActive]}
            onPress={() => setActiveTab('archive')}
          >
            <Text style={[styles.tabText, activeTab === 'archive' && styles.tabTextActive]}>Archive ({archivedPackages.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'deleted' && styles.tabActive]}
            onPress={() => setActiveTab('deleted')}
          >
            <Text style={[styles.tabText, activeTab === 'deleted' && styles.tabTextActive]}>Deleted ({deletedPackages.length})</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'home' && showMemberChips && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipBar}
            contentContainerStyle={{ paddingHorizontal: 12, alignItems: 'center' }}
          >
            <TouchableOpacity
              style={[styles.chip, !memberFilter && styles.chipActive]}
              onPress={() => setMemberFilter(null)}
            >
              <Text style={[styles.chipText, !memberFilter && styles.chipTextActive]}>Everyone</Text>
            </TouchableOpacity>
            {householdMembers.filter((m) => m.user_id).map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[styles.chip, memberFilter === m.id && styles.chipActive]}
                onPress={() => setMemberFilter(memberFilter === m.id ? null : m.id)}
              >
                <Text style={[styles.chipText, memberFilter === m.id && styles.chipTextActive]}>
                  {m.display_name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {activeTab === 'home' && (
          activePackages.length === 0 ? (
            <ScrollView style={styles.emptyStateScroll}>
              <View style={styles.emptyContent}>
                <Text style={styles.emptyIcon}>📦</Text>
                <Text style={styles.emptyTitle}>No packages yet</Text>

                {user?.trackingEmail && (
                  <View style={styles.trackingEmailBox}>
                    <Text style={styles.trackingEmailLabel}>Your tracking email:</Text>
                    <Text style={styles.trackingEmailValue}>{user.trackingEmail}</Text>
                    <Text style={styles.trackingEmailHint}>Register this address with carriers below</Text>
                  </View>
                )}

                {joinedMembers.length <= 1 && (
                  <TouchableOpacity
                    style={styles.householdPromo}
                    onPress={() => { fetchHousehold(); setScreen('household'); }}
                  >
                    <Text style={styles.householdPromoTitle}>👋 Live with someone?</Text>
                    <Text style={styles.householdPromoBody}>
                      Invite them to your household — everyone sees every package coming to your home, in one shared feed.
                    </Text>
                    <Text style={styles.householdPromoLink}>Set up your household →</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.carrierSection}>
                  <Text style={styles.carrierTitle}>Pending Registration</Text>
                  {getCarriers(user?.trackingEmail).filter(c => !completedCarriers.includes(c.id)).map(carrier => (
                    <View key={carrier.id} style={styles.carrierCheckCard}>
                      <View style={styles.carrierCheckRow}>
                        <View style={styles.carrierCheckContent}>
                          <Text style={styles.carrierName}>{carrier.name}</Text>
                        </View>
                        <Checkbox
                          checked={completedCarriers.includes(carrier.id)}
                          onPress={() => toggleCarrierComplete(carrier.id)}
                        />
                      </View>
                      {carrier.steps.map((step, idx) => (
                        <Text key={idx} style={styles.carrierStep}>{step}</Text>
                      ))}
                    </View>
                  ))}
                </View>

                {completedCarriers.length > 0 && (
                  <View style={styles.registeredSection}>
                    <Text style={styles.registeredTitle}>✓ Registered Carriers</Text>
                    {getCarriers(user?.trackingEmail).filter(c => completedCarriers.includes(c.id)).map(carrier => (
                      <View key={carrier.id} style={styles.registeredCarrier}>
                        <Text style={styles.registeredCarrierName}>{carrier.name}</Text>
                        <TouchableOpacity onPress={() => toggleCarrierComplete(carrier.id)}>
                          <Text style={styles.unregisterText}>Mark as pending</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>
          ) : (
            <SwipeListView
              data={activeRows}
              keyExtractor={item => item.id}
              renderItem={({ item }) => {
                if (item._type === 'header') {
                  return <Text style={styles.sectionHeader}>{item.title}</Text>;
                }
                return (
                  <SwipeablePackageCard
                    item={item}
                    onPress={() => { setSelectedPackage(item); setScreen('detail'); }}
                    onSwipeRight={() => archivePackage(item)}
                    onSwipeLeft={() => moveToDeleted(item)}
                    isArchived={false}
                    showRecipient={joinedMembers.length > 1}
                    recipientMember={item.recipient_member_id ? memberById[item.recipient_member_id] : null}
                  />
                );
              }}
              renderHiddenItem={() => null}
              contentContainerStyle={{ paddingBottom: 24 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
              scrollEnabled={true}
              disableLeftSwipe={false}
              disableRightSwipe={false}
              ListFooterComponent={() => {
                const pendingCarriers = getCarriers(user?.trackingEmail).filter(c => !completedCarriers.includes(c.id));
                return pendingCarriers.length > 0 ? (
                  <View style={styles.pendingCarriersSection}>
                    <Text style={styles.carrierTitle}>Pending Registration</Text>
                    {pendingCarriers.map(carrier => (
                      <View key={carrier.id} style={styles.carrierCheckCard}>
                        <View style={styles.carrierCheckRow}>
                          <View style={styles.carrierCheckContent}>
                            <Text style={styles.carrierName}>{carrier.name}</Text>
                          </View>
                          <Checkbox
                            checked={completedCarriers.includes(carrier.id)}
                            onPress={() => toggleCarrierComplete(carrier.id)}
                          />
                        </View>
                        {carrier.steps.map((step, idx) => (
                          <Text key={idx} style={styles.carrierStep}>{step}</Text>
                        ))}
                      </View>
                    ))}
                  </View>
                ) : null;
              }}
            />
          )
        )}
        {activeTab === 'archive' && (
          archivedPackages.length === 0 ? (
            <View style={[styles.container, styles.center]}>
              <Text style={styles.emptyTitle}>No archived packages</Text>
            </View>
          ) : (
            <SwipeListView
              data={archivedPackages}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <SwipeablePackageCard
                  item={item}
                  onPress={() => { setSelectedPackage(item); setScreen('detail'); }}
                  onSwipeRight={() => unarchivePackage(item)}
                  onSwipeLeft={() => moveToDeleted(item)}
                  isArchived={true}
                />
              )}
              renderHiddenItem={() => null}
              contentContainerStyle={{ paddingBottom: 24 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
              scrollEnabled={true}
              disableLeftSwipe={false}
              disableRightSwipe={false}
            />
          )
        )}
        {activeTab === 'deleted' && (
          deletedPackages.length === 0 ? (
            <View style={[styles.container, styles.center]}>
              <Text style={styles.emptyTitle}>No deleted packages</Text>
            </View>
          ) : (
            <SwipeListView
              data={deletedPackages}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <SwipeablePackageCard
                  item={item}
                  onPress={() => { setSelectedPackage(item); setScreen('detail'); }}
                  onSwipeRight={() => restoreFromDeleted(item)}
                  onSwipeLeft={() => setShowPermanentDeleteConfirm(item)}
                  isArchived={false}
                  isDeleted={true}
                />
              )}
              renderHiddenItem={() => null}
              contentContainerStyle={{ paddingBottom: 24 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
              scrollEnabled={true}
              disableLeftSwipe={false}
              disableRightSwipe={false}
            />
          )
        )}
      </SafeAreaView>

      {showDeleteConfirm && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDeleteConfirm(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Delete package?</Text>
              <Text style={styles.modalText}>This action cannot be undone.</Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setShowDeleteConfirm(null)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonDelete]}
                  onPress={() => {
                    deletePackage(showDeleteConfirm);
                    setShowDeleteConfirm(null);
                  }}
                >
                  <Text style={[styles.modalButtonText, { color: colors.error }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {showPermanentDeleteConfirm && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowPermanentDeleteConfirm(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Delete forever?</Text>
              <Text style={styles.modalText}>This package will be permanently deleted and cannot be restored.</Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setShowPermanentDeleteConfirm(null)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonDelete]}
                  onPress={() => {
                    deletePackage(showPermanentDeleteConfirm);
                    setShowPermanentDeleteConfirm(null);
                  }}
                >
                  <Text style={[styles.modalButtonText, { color: colors.error }]}>Delete Forever</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerLogoContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerLogoText: { color: colors.text, fontSize: 18, fontWeight: '600' },
  settingsIcon: { fontSize: 24 },
  tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { color: colors.textMuted, fontSize: 14, fontWeight: '500' },
  tabTextActive: { color: colors.primary, fontWeight: '600' },
  chipBar: { flexGrow: 0, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  chip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginRight: 8 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  emptyStateScroll: { flex: 1 },
  emptyContent: { paddingTop: 40, paddingHorizontal: 20, paddingBottom: 40 },
  emptyIcon: { fontSize: 64, textAlign: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: colors.text, textAlign: 'center', marginBottom: 24 },
  packageCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.card, marginHorizontal: 12, marginVertical: 6, paddingVertical: 16, paddingHorizontal: 16, borderRadius: 8 },
  packageLeft: { flex: 1 },
  packageMerchant: { fontSize: 16, fontWeight: '600', color: colors.text },
  packageCarrier: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  trackingNumberText: { fontSize: 11, color: colors.textMuted, marginTop: 2, fontFamily: 'monospace' },
  notePreview: { fontSize: 12, color: colors.textMuted, marginTop: 6, fontStyle: 'italic' },
  packageFromSubtle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  trackingNumberLink: { fontSize: 11, color: colors.primary, marginTop: 4, fontFamily: 'monospace', textDecorationLine: 'underline' },
  detailValueLink: { fontSize: 15, color: colors.primary, marginBottom: 8, textDecorationLine: 'underline' },
  restoreToEditTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 },
  restoreToEditBody: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  authHelpRow: { marginTop: 16, alignItems: 'center', gap: 10 },
  authLinkText: { color: colors.primary, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  authLinkSubtle: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  helpModalCard: { backgroundColor: colors.card, borderRadius: 12, padding: 24, width: '100%', maxWidth: 380 },
  helpModalTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 },
  helpModalBody: { fontSize: 14, color: colors.text, lineHeight: 20, marginBottom: 12 },
  helpModalLinkButton: { paddingVertical: 10, alignItems: 'center', marginBottom: 8 },
  helpModalLinkText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  helpModalCloseButton: { paddingVertical: 12, alignItems: 'center', marginTop: 4, borderTopWidth: 1, borderTopColor: colors.border || '#eee' },
  helpModalCloseText: { color: colors.textMuted, fontSize: 14, fontWeight: '500' },
  packageMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  deliveryBadge: { backgroundColor: colors.primary + '22', borderWidth: 1, borderColor: colors.primary, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  deliveryBadgeLabel: { fontSize: 10, color: colors.primary, fontWeight: '700', letterSpacing: 1 },
  deliveryBadgeDate: { fontSize: 14, color: colors.primary, fontWeight: '700', marginTop: 2 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusEdge: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  statusPill: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10 },
  statusPillText: { fontSize: 11, fontWeight: '600' },
  packageRight: { alignItems: 'flex-end', justifyContent: 'center', gap: 6, marginLeft: 10 },
  packageRightBadges: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  giftIndicator: { fontSize: 14 },
  memberChipSmall: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  memberChipSmallText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  sectionHeader: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginHorizontal: 16, marginTop: 14, marginBottom: 2 },
  householdPromo: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.primary + '55', borderRadius: 12, padding: 16, marginTop: 16, width: '100%' },
  householdPromoTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  householdPromoBody: { color: colors.textMuted, fontSize: 13, marginTop: 6, lineHeight: 18 },
  householdPromoLink: { color: colors.primary, fontSize: 13, fontWeight: '600', marginTop: 10 },
  inviteBanner: { backgroundColor: colors.primary + '18', borderWidth: 1, borderColor: colors.primary, borderRadius: 12, padding: 16, marginBottom: 12 },
  inviteBannerTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  inviteBannerBody: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  deleteAccountLink: { alignItems: 'center', marginTop: 24, marginBottom: 32 },
  deleteAccountText: { color: colors.textMuted, fontSize: 13, textDecorationLine: 'underline' },
  rowBack: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', borderRadius: 8, overflow: 'hidden' },
  backActionDelete: { backgroundColor: colors.error, flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 },
  backActionDeleteForever: { backgroundColor: '#991b1b', flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 },
  backActionArchive: { backgroundColor: colors.primary, flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 },
  backActionLabel: { color: '#fff', fontWeight: '600', fontSize: 13 },
  arrowText: { color: '#fff', fontSize: 18 },
  card: { backgroundColor: colors.card, marginHorizontal: 12, marginVertical: 12, paddingVertical: 16, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  button: { backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  buttonDanger: { backgroundColor: colors.error },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  input: { backgroundColor: colors.border, color: colors.text, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 6, marginTop: 8 },
  authContainer: { flexGrow: 1, justifyContent: 'space-between', paddingVertical: 40, paddingHorizontal: 20 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoText: { fontSize: 32, fontWeight: '700', color: colors.text, marginTop: 16 },
  logoSubtext: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  authTabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 24 },
  authTab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  authTabActive: { borderBottomColor: colors.primary },
  authTabText: { color: colors.textMuted, fontWeight: '500' },
  authTabTextActive: { color: colors.primary, fontWeight: '600' },
  content: { flex: 1, paddingBottom: 20 },
  backButton: { padding: 8 },
  backButtonText: { color: colors.primary, fontSize: 16 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  merchantName: { fontSize: 20, fontWeight: '700', color: colors.text },
  statusBadge: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, marginTop: 8, borderWidth: 1 },
  statusText: { fontWeight: '600', fontSize: 12 },
  deliveryDate: { color: colors.textMuted, marginTop: 12, fontSize: 14 },
  deliveryDateBox: { backgroundColor: colors.primary + '22', borderWidth: 1, borderColor: colors.primary, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, marginTop: 16, alignItems: 'center' },
  deliveryDateLabel: { fontSize: 11, color: colors.primary, fontWeight: '600', letterSpacing: 1, marginBottom: 4 },
  deliveryDateValue: { fontSize: 22, color: colors.primary, fontWeight: '700' },
  detailLabel: { color: colors.textMuted, fontSize: 12, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue: { color: colors.text, fontSize: 16, marginTop: 4 },
  trackingEmailBox: { backgroundColor: colors.card, paddingVertical: 16, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.primary, marginBottom: 24 },
  trackingEmailLabel: { color: colors.textMuted, fontSize: 12, marginBottom: 8 },
  trackingEmailValue: { color: colors.primary, fontSize: 14, fontFamily: 'monospace', fontWeight: '600', marginBottom: 8 },
  trackingEmailHint: { color: colors.textMuted, fontSize: 11 },
  carrierSection: { marginTop: 24 },
  pendingCarriersSection: { marginHorizontal: 12, marginTop: 20, marginBottom: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.border },
  carrierTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 12 },
  carrierCard: { backgroundColor: colors.card, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  carrierCheckCard: { backgroundColor: colors.card, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  carrierCheckRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  carrierCheckContent: { flex: 1 },
  carrierName: { fontSize: 14, fontWeight: '600', color: colors.text },
  carrierStep: { color: colors.textMuted, fontSize: 12, marginBottom: 6, lineHeight: 18 },
  checkbox: { width: 24, height: 24, borderRadius: 4, borderWidth: 2, borderColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: colors.primary },
  checkboxText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  registeredSection: { marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: colors.border },
  registeredTitle: { fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 12 },
  registeredCarrier: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  registeredCarrierName: { fontSize: 14, fontWeight: '500', color: colors.text },
  unregisterText: { fontSize: 12, color: colors.primary, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: colors.card, paddingVertical: 20, paddingHorizontal: 20, borderRadius: 12, width: '80%', borderWidth: 1, borderColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 },
  modalText: { fontSize: 14, color: colors.textMuted, marginBottom: 20 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalButton: { flex: 1, paddingVertical: 10, borderRadius: 6, alignItems: 'center' },
  modalButtonCancel: { backgroundColor: colors.border },
  modalButtonDelete: { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderWidth: 1, borderColor: colors.error },
  modalButtonText: { color: colors.text, fontWeight: '600', fontSize: 14 },
});
