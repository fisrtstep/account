import { useEffect, useState } from 'react';
import { Alert, Button, Card, Input, PageHeader, Spinner, toast } from 'host/ui';

const API = 'https://fakestoreapi.com';

/**
 * Account page — host should pass { token, userId, username }.
 * Fetches GET /users/:userId for the profile; edits are sent with PUT /users/:userId.
 */
export function Page({ token, userId, username }) {
    const [profile, setProfile] = useState(null);
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');
    const [editing, setEditing] = useState(false);

    useEffect(() => {
        if (userId == null || userId === '') {
            setStatus('need-user');
            setProfile(null);
            return;
        }

        let cancelled = false;
        setStatus('loading');
        setError('');

        fetch(`${API}/users/${userId}`)
            .then((res) => {
                if (!res.ok) throw new Error(`User request failed (${res.status})`);
                return res.json();
            })
            .then((data) => {
                if (cancelled) return;
                setProfile(data);
                setStatus('ready');
            })
            .catch((err) => {
                if (cancelled) return;
                setError(err.message || 'Failed to load profile');
                setStatus('error');
            });

        return () => {
            cancelled = true;
        };
    }, [userId]);

    return (
        <section className="space-y-6">
            <PageHeader
                title="Account"
                subtitle={
                    (username ? `Signed in as ${username}` : 'Profile from Fake Store') +
                    (token ? '' : ' · no token passed yet')
                }
                actions={
                    status === 'ready' &&
                    !editing && (
                        <Button variant="secondary" onClick={() => setEditing(true)}>
                            Edit profile
                        </Button>
                    )
                }
            />

            {status === 'need-user' && (
                <Alert tone="warning">
                    Pass a <code className="font-mono">userId</code> prop from the host
                    (decoded JWT <code className="font-mono">sub</code>) to load this profile.
                </Alert>
            )}

            {status === 'loading' && <Spinner label="Loading profile…" />}

            {status === 'error' && <Alert tone="error">{error}</Alert>}

            {status === 'ready' && profile && !editing && (
                <Card>
                    <dl className="divide-y divide-slate-100">
                        <Row label="Name" value={`${profile.name?.firstname ?? ''} ${profile.name?.lastname ?? ''}`.trim() || '—'} />
                        <Row label="Username" value={profile.username ?? '—'} />
                        <Row label="Email" value={profile.email ?? '—'} />
                        <Row label="Phone" value={profile.phone ?? '—'} />
                        <Row
                            label="Address"
                            value={
                                profile.address
                                    ? `${profile.address.number ?? ''} ${profile.address.street ?? ''}, ${profile.address.city ?? ''} ${profile.address.zipcode ?? ''}`.trim()
                                    : '—'
                            }
                        />
                        <Row label="User id" value={String(profile.id ?? userId)} />
                    </dl>
                </Card>
            )}

            {status === 'ready' && profile && editing && (
                <EditProfile
                    profile={profile}
                    onCancel={() => setEditing(false)}
                    onSaved={(next) => {
                        setProfile(next);
                        setEditing(false);
                    }}
                />
            )}
        </section>
    );
}

function EditProfile({ profile, onCancel, onSaved }) {
    const [form, setForm] = useState({
        firstname: profile.name?.firstname ?? '',
        lastname: profile.name?.lastname ?? '',
        email: profile.email ?? '',
        phone: profile.phone ?? '',
        city: profile.address?.city ?? '',
        street: profile.address?.street ?? '',
        zipcode: profile.address?.zipcode ?? '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const field = (name) => ({
        id: `account-${name}`,
        value: form[name],
        onChange: (e) => setForm((f) => ({ ...f, [name]: e.target.value })),
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const next = {
            ...profile,
            email: form.email,
            phone: form.phone,
            name: { firstname: form.firstname, lastname: form.lastname },
            address: {
                ...profile.address,
                city: form.city,
                street: form.street,
                zipcode: form.zipcode,
            },
        };

        setSaving(true);
        setError('');
        fetch(`${API}/users/${profile.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(next),
        })
            .then((res) => {
                if (!res.ok) throw new Error(`Update failed (${res.status})`);
                // Fake Store doesn't persist writes, so keep the submitted values locally
                onSaved(next);
                toast('Profile updated');
            })
            .catch((err) => setError(err.message || 'Update failed'))
            .finally(() => setSaving(false));
    };

    return (
        <Card as="form" onSubmit={handleSubmit} className="space-y-4 p-4">
            {error && <Alert tone="error">{error}</Alert>}
            <div className="grid gap-4 sm:grid-cols-2">
                <Input label="First name" required {...field('firstname')} />
                <Input label="Last name" required {...field('lastname')} />
                <Input label="Email" type="email" required {...field('email')} />
                <Input label="Phone" type="tel" {...field('phone')} />
                <Input label="Street" {...field('street')} />
                <Input label="City" {...field('city')} />
                <Input label="Zip code" {...field('zipcode')} />
            </div>
            <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={onCancel} disabled={saving}>
                    Cancel
                </Button>
                <Button type="submit" loading={saving}>
                    Save changes
                </Button>
            </div>
        </Card>
    );
}

function Row({ label, value }) {
    return (
        <div className="grid gap-1 px-4 py-3 sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-slate-500">{label}</dt>
            <dd className="text-sm text-slate-900 sm:col-span-2">{value}</dd>
        </div>
    );
}

export default Page;
