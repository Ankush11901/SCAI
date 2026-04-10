import {
  GithubIcon,
  LinkedinIcon,
  TwitterIcon,
  YoutubeIcon,
} from "lucide-react";

export function Footer() {
  const year = new Date().getFullYear();

  const product = [
    { title: "Features", href: "#features" },
    { title: "Pricing", href: "#pricing" },
    { title: "Integrations", href: "#integrations" },
    { title: "WordPress Plugin", href: "#integrations" },
    { title: "API Reference", href: "#" },
  ];

  const articleTypes = [
    { title: "Affiliate", href: "#features" },
    { title: "How-To", href: "#features" },
    { title: "Comparison", href: "#features" },
    { title: "Review", href: "#features" },
    { title: "Listicle", href: "#features" },
    { title: "Recipe", href: "#features" },
  ];

  const resources = [
    { title: "Documentation", href: "#" },
    { title: "Blog", href: "#" },
    { title: "Changelog", href: "#" },
    { title: "Help Center", href: "#" },
    { title: "Contact Support", href: "#" },
  ];

  const company = [
    { title: "About", href: "#" },
    { title: "Careers", href: "#" },
    { title: "Privacy Policy", href: "#" },
    { title: "Terms of Service", href: "#" },
  ];

  const socialLinks = [
    { icon: <TwitterIcon className="size-4" />, link: "#", label: "Twitter" },
    { icon: <LinkedinIcon className="size-4" />, link: "#", label: "LinkedIn" },
    { icon: <GithubIcon className="size-4" />, link: "#", label: "GitHub" },
    { icon: <YoutubeIcon className="size-4" />, link: "#", label: "YouTube" },
  ];

  const linkColumns = [
    { heading: "Product", links: product },
    { heading: "Article Types", links: articleTypes },
    { heading: "Resources", links: resources },
    { heading: "Company", links: company },
  ];

  return (
    <footer className="border-t border-scai-border/60">
      <div className="mx-auto max-w-[1200px] px-6 pb-8 pt-16">
        {/* Top row: brand + link columns */}
        <div className="grid gap-12 lg:grid-cols-[1fr_auto]">
          {/* Brand block */}
          <div className="max-w-sm">
            <a href="/" className="inline-block">
              <img
                src="/logo.svg"
                alt="SEOContent.AI"
                className="h-7"
              />
            </a>
            <p className="mt-4 text-sm leading-relaxed text-scai-text-sec">
              Publish-ready SEO articles for publishers, agencies, and content
              teams. Structured HTML — not AI drafts you have to rewrite.
            </p>
            <div className="mt-5 flex gap-2">
              {socialLinks.map((item) => (
                <a
                  key={item.label}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-scai-border/60 text-scai-text-muted transition-colors hover:border-[#7fffd4]/20 hover:text-scai-text-sec"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={item.link}
                  aria-label={item.label}
                >
                  {item.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
            {linkColumns.map((col) => (
              <div key={col.heading}>
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-scai-text-muted">
                  {col.heading}
                </span>
                <div className="mt-4 flex flex-col gap-2.5">
                  {col.links.map((link) => (
                    <a
                      key={link.title}
                      className="text-sm text-scai-text-sec transition-colors hover:text-scai-text"
                      href={link.href}
                    >
                      {link.title}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-scai-border/60 pt-6 sm:flex-row">
          <p className="text-xs text-scai-text-muted">
            &copy; {year} SEOContent.AI. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-xs text-scai-text-muted transition-colors hover:text-scai-text-sec">
              Privacy Policy
            </a>
            <a href="#" className="text-xs text-scai-text-muted transition-colors hover:text-scai-text-sec">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
