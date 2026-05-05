import { Link } from 'react-router-dom'
import { MapPin, Phone, Mail, ExternalLink } from 'lucide-react'

const SOCIAL = [
  { name: 'Instagram', href: 'https://instagram.com' },
  { name: 'Facebook',  href: 'https://facebook.com' },
  { name: 'YouTube',   href: 'https://youtube.com' },
]

const LINKS = [
  { label: 'Home',         path: '/' },
  { label: 'All Products', path: '/shop' },
  { label: 'Cart',         path: '/cart' },
  { label: 'My Orders',    path: '/my-orders' },
  { label: 'Login',        path: '/login' },
]

export default function Footer() {
  return (
    <footer className="bg-dark-card border-t border-dark-border mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">

          <div>
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/logo.png"
                alt="AUTOCRAFT"
                className="h-10 w-auto object-contain"
              />
            </div>
            <p className="text-dark-muted text-sm leading-relaxed mb-4">
              Premium car decoration and accessories for every drive. Quality, style, and performance — crafted for Indian roads.
            </p>
            <div className="flex gap-2 flex-wrap">
              {SOCIAL.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-xs border border-dark-border rounded-lg text-dark-muted hover:text-primary-500 hover:border-primary-500 transition-all"
                >
                  {s.name}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-display font-semibold text-dark-text mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {LINKS.map((l) => (
                <li key={l.path}>
                  <Link
                    to={l.path}
                    className="text-sm text-dark-muted hover:text-primary-500 transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display font-semibold text-dark-text mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin size={16} className="text-primary-500 mt-0.5 shrink-0" />
                <span className="text-sm text-dark-muted">
                  Old Military Hospital Road, beside Auto Plaza, Gowala Patti, Cooch Behar, West Bengal 736101
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={16} className="text-primary-500 shrink-0" />
                <a
                  href="tel:+919064768662"
                  className="text-sm text-dark-muted hover:text-primary-500 transition-colors"
                >
                  +91 90647 68662
                </a>
                <a
                  href="tel:+919614196176"
                  className="text-sm text-dark-muted hover:text-primary-500 transition-colors"
                >
                  +91 96141 96176
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={16} className="text-primary-500 shrink-0" />
                <a
                  href="mailto:hello@autocraft.in"
                  className="text-sm text-dark-muted hover:text-primary-500 transition-colors"
                >
                  hello@autocraft.in
                </a>
              </li>
              <li className="flex items-center gap-3">
                <ExternalLink size={16} className="text-primary-500 shrink-0" />
                <a
                  href="https://wa.me/919064768662"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-dark-muted hover:text-primary-500 transition-colors"
                >
                  WhatsApp Us
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display font-semibold text-dark-text mb-4">Find Us</h3>
            <div className="rounded-xl overflow-hidden border border-dark-border h-36">
              <iframe
                title="AUTOCRAFT Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d223.49923726378722!2d89.45513295440827!3d26.326894662697317!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39e2ffb7cfb0b683%3A0xf3d09f521e5d9818!2sAUTOCRAFT!5e0!3m2!1sen!2sin!4v1777529254517!5m2!1sen!2sin"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
              />
            </div>
            <a
              href="https://maps.app.goo.gl/xQ1ELDxcSUT1uU326"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary-500 hover:text-accent-400 transition-colors mt-2"
            >
              <ExternalLink size={14} /> Find AUTOCRAFT on Google Maps
            </a>
          </div>
        </div>

        <hr className="border-dark-border my-8" />
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-dark-muted">
          <p>© 2026 AUTOCRAFT Car Decoration. All rights reserved.</p>
          <p>Made with ❤️ in Cooch Behar, India</p>
        </div>
      </div>
    </footer>
  )
}