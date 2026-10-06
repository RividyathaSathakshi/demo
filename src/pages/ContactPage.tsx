import { useState, type FormEvent } from 'react';
import { useI18n } from '../i18n';
import { PageHeader } from './PageHeader';
import { Button, Field } from '../components/ui';
import { Icon } from '../components/Icon';
import { CONTACT_EMAIL } from '../config/app';

export default function ContactPage() {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const body = `${message}\n\n${name}${email ? ` <${email}>` : ''}`;
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(t('contact.emailSubject'))}&body=${encodeURIComponent(body)}`;
  };
  return (
    <>
      <PageHeader title={t('contact.title')} lead={t('contact.lead')} />
      <section className="container-page grid gap-12 py-14 lg:grid-cols-[1.3fr_1fr]">
        <form onSubmit={submit} className="space-y-5" aria-labelledby="form-h">
          <h2 id="form-h" className="text-h2">{t('contact.formTitle')}</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t('contact.name')} htmlFor="c-name">
              <input id="c-name" className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </Field>
            <Field label={t('contact.email')} htmlFor="c-email">
              <input id="c-email" type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </Field>
          </div>
          <Field label={t('contact.message')} htmlFor="c-msg" hint={t('contact.note')}>
            <textarea id="c-msg" required rows={6} className="field" value={message} onChange={(e) => setMessage(e.target.value)} />
          </Field>
          <Button type="submit" icon="mail">
            {t('contact.send')}
          </Button>
        </form>
        <aside className="self-start rounded-2xl bg-panel-alt/70 p-6">
          <Icon name="pin" size={28} className="text-rose" />
          <h2 className="mt-3 text-h3">{t('contact.exhibitionTitle')}</h2>
          <p className="mt-2 text-muted">{t('contact.exhibitionBody')}</p>
        </aside>
      </section>
    </>
  );
}
