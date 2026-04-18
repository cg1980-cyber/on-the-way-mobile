import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, ScrollView,
  StatusBar, SafeAreaView, RefreshControl, Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { SwipeListView } from 'react-native-swipe-list-view';

const SUPABASE_URL = 'https://clqivishcuwlptoumdre.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscWl2aXNoY3V3bHB0b3VtZHJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NjYzNTUsImV4cCI6MjA5MTQ0MjM1NX0.YAoevh3WNcKVpsj46f0lNFj3kRUmvp2g7FoUp9f1opI';
const RAILWAY_URL = 'https://on-the-way-backend-production.up.railway.app';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

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

const carriers = [
  {
    id: 'usps',
    name: '📮 USPS Informed Delivery',
    steps: [
      '1. Go to informeddelivery.usps.com',
      '2. Sign up with your email',
      '3. Go to Settings → Notifications',
      '4. Enter your tracking email above'
    ]
  },
  {
    id: 'ups',
    name: '📦 UPS My Choice',
    steps: [
      '1. Go to ups.com/mychoice',
      '2. Create an account',
      '3. Add your tracking email above',
      '4. Enable delivery notifications'
    ]
  },
  {
    id: 'fedex',
    name: '🚚 FedEx Delivery Manager',
    steps: [
      '1. Go to fedex.com/deliverymanager',
      '2. Sign up for an account',
      '3. Set notification email to your tracking email',
      '4. Save preferences'
    ]
  }
];

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

  useEffect(() => { checkSession(); }, []);

  async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUser(session.user);
      const trackingEmail = await fetchUserProfile(session.user.id);
      if (trackingEmail) setUser(prev => ({ ...prev, trackingEmail }));
      const completed = await AsyncStorage.getItem('completedCarriers');
      if (completed) setCompletedCarriers(JSON.parse(completed));
      setScreen('home');
      fetchPackages(session.user.id);
    } else {
      setScreen('auth');
    }
  }

  async function fetchUserProfile(userId) {
    try {
      const res = await fetch(RAILWAY_URL + '/api/auth/profile', {
        headers: { 'x-user-id': userId },
      });
      const data = await res.json();
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
      const res = await fetch(RAILWAY_URL + '/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
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

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
    setPackages([]);
    setCompletedCarriers([]);
    setScreen('auth');
  }

  async function fetchPackages(userId) {
    try {
      const res = await fetch(RAILWAY_URL + '/api/packages', {
        headers: { 'x-user-id': userId || user?.id },
      });
      const data = await res.json();
      setPackages(Array.isArray(data) ? data : []);
    } catch (err) { console.error('Fetch packages error:', err); }
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchPackages(user?.id);
    setRefreshing(false);
  }

  async function updateNickname(pkg, nickname) {
    try {
      await fetch(RAILWAY_URL + '/api/packages/' + pkg.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({ nickname }),
      });
      fetchPackages(user.id);
    } catch (err) { console.error('Update error:', err); }
  }

  async function archivePackage(pkg) {
    try {
      await fetch(RAILWAY_URL + '/api/packages/' + pkg.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({ archived: true }),
      });
      fetchPackages(user.id);
    } catch (err) { console.error('Archive error:', err); }
  }

  async function unarchivePackage(pkg) {
    try {
      await fetch(RAILWAY_URL + '/api/packages/' + pkg.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({ archived: false }),
      });
      fetchPackages(user.id);
    } catch (err) { console.error('Unarchive error:', err); }
  }

  async function deletePackage(pkg) {
    try {
      await fetch(RAILWAY_URL + '/api/packages/' + pkg.id, {
        method: 'DELETE',
        headers: { 'x-user-id': user.id },
      });
      fetchPackages(user.id);
    } catch (err) { console.error('Delete error:', err); }
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

  function deduplicatePackages(pkgs, includeArchived = false) {
    const filtered = pkgs.filter(p => includeArchived ? p.archived : !p.archived);
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
          </View>
        </ScrollView>
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
                <Text style={styles.deliveryDateValue}>{pkg.estimated_delivery}</Text>
              </View>
            )}
          </View>
          <View style={styles.card}>
            <Text style={styles.detailLabel}>Carrier</Text>
            <Text style={styles.detailValue}>{pkg.carrier}</Text>
            {pkg.tracking_number && (<><Text style={styles.detailLabel}>Tracking Number</Text><Text style={styles.detailValue}>{pkg.tracking_number}</Text></>)}
            <Text style={styles.detailLabel}>Last Updated</Text>
            <Text style={styles.detailValue}>{new Date(pkg.last_updated).toLocaleString()}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.detailLabel}>Add a Label</Text>
            <TextInput style={styles.input} placeholder="e.g. Birthday gift, New shoes..." placeholderTextColor={colors.textMuted} defaultValue={pkg.nickname || ''} onEndEditing={(e) => updateNickname(pkg, e.nativeEvent.text)} />
          </View>
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
            {carriers.map(carrier => (
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
          <TouchableOpacity style={styles.button} onPress={() => setScreen('instructions')}>
            <Text style={styles.buttonText}>View Carrier Setup Instructions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.buttonDanger, { marginTop: 12 }]} onPress={handleSignOut}>
            <Text style={styles.buttonText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const activePackages = deduplicatePackages(packages, false);
  const archivedPackages = deduplicatePackages(packages, true);

  return (
    <>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={styles.header}>
          <View style={styles.headerLogoContainer}>
            <HousePathLogo size={28} />
            <Text style={styles.headerLogoText}>On the Way</Text>
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
            <Text style={[styles.tabText, activeTab === 'home' && styles.tabTextActive]}>Active</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'archive' && styles.tabActive]}
            onPress={() => setActiveTab('archive')}
          >
            <Text style={[styles.tabText, activeTab === 'archive' && styles.tabTextActive]}>Archive ({archivedPackages.length})</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'home' ? (
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

                <View style={styles.carrierSection}>
                  <Text style={styles.carrierTitle}>Pending Registration</Text>
                  {carriers.filter(c => !completedCarriers.includes(c.id)).map(carrier => (
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
                    {carriers.filter(c => completedCarriers.includes(c.id)).map(carrier => (
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
              data={activePackages}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <PackageCard
                  item={item}
                  onPress={() => { setSelectedPackage(item); setScreen('detail'); }}
                />
              )}
              renderHiddenItem={({ item }) => (
                <HiddenActionsHome
                  item={item}
                  onDelete={() => deletePackage(item)}
                  onArchive={() => archivePackage(item)}
                />
              )}
              leftOpenValue={75}
              rightOpenValue={-75}
              swipeToOpenPercent={10}
              swipeToClosePercent={10}
              contentContainerStyle={{ paddingBottom: 24 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
              friction={2}
              tension={40}
              directionalDistanceChangeThreshold={2}
              disableLeftSwipe={false}
              disableRightSwipe={false}
              onRowOpen={(rowKey, rowMap, direction) => {
                const pkg = activePackages.find(p => p.id === rowKey);
                if (pkg && direction === 'right') archivePackage(pkg);
                if (pkg && direction === 'left') deletePackage(pkg);
                if (rowMap[rowKey]) rowMap[rowKey].closeRow();
              }}
              ListFooterComponent={() => {
                const pendingCarriers = carriers.filter(c => !completedCarriers.includes(c.id));
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
        ) : (
          archivedPackages.length === 0 ? (
            <View style={[styles.container, styles.center]}>
              <Text style={styles.emptyTitle}>No archived packages</Text>
            </View>
          ) : (
            <SwipeListView
              data={archivedPackages}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <PackageCard 
                  item={item}
                  onPress={() => { setSelectedPackage(item); setScreen('detail'); }}
                />
              )}
              renderHiddenItem={({ item }) => (
                <HiddenActionsArchive 
                  item={item}
                  onDelete={() => deletePackage(item)}
                  onUnarchive={() => unarchivePackage(item)}
                />
              )}
              leftOpenValue={75}
              rightOpenValue={-75}
              swipeToOpenPercent={10}
              swipeToClosePercent={10}
              contentContainerStyle={{ paddingBottom: 24 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
              friction={2}
              tension={40}
              directionalDistanceChangeThreshold={2}
              disableLeftSwipe={false}
              disableRightSwipe={false}
              onRowOpen={(rowKey, rowMap, direction) => {
                const pkg = archivedPackages.find(p => p.id === rowKey);
                if (pkg && direction === 'right') unarchivePackage(pkg);
                if (pkg && direction === 'left') deletePackage(pkg);
                if (rowMap[rowKey]) rowMap[rowKey].closeRow();
              }}
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
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerLogoContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerLogoText: { color: colors.text, fontSize: 18, fontWeight: '600' },
  settingsIcon: { fontSize: 24 },
  tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { color: colors.textMuted, fontSize: 14, fontWeight: '500' },
  tabTextActive: { color: colors.primary, fontWeight: '600' },
  emptyStateScroll: { flex: 1 },
  emptyContent: { paddingTop: 40, paddingHorizontal: 20, paddingBottom: 40 },
  emptyIcon: { fontSize: 64, textAlign: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: colors.text, textAlign: 'center', marginBottom: 24 },
  packageCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.card, marginHorizontal: 12, marginVertical: 6, paddingVertical: 16, paddingHorizontal: 16, borderRadius: 8 },
  packageLeft: { flex: 1 },
  packageMerchant: { fontSize: 16, fontWeight: '600', color: colors.text },
  packageCarrier: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  trackingNumberText: { fontSize: 11, color: colors.textMuted, marginTop: 2, fontFamily: 'monospace' },
  packageMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  deliveryBadge: { backgroundColor: colors.primary + '22', borderWidth: 1, borderColor: colors.primary, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  deliveryBadgeLabel: { fontSize: 10, color: colors.primary, fontWeight: '700', letterSpacing: 1 },
  deliveryBadgeDate: { fontSize: 14, color: colors.primary, fontWeight: '700', marginTop: 2 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  rowBack: { flexDirection: 'row', flex: 1, marginHorizontal: 12, marginVertical: 6, borderRadius: 8, overflow: 'hidden' },
  backActionDelete: { backgroundColor: colors.error, flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 },
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