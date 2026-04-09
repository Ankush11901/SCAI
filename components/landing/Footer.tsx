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
    { icon: <TwitterIcon className="size-4" />, link: "#" },
    { icon: <LinkedinIcon className="size-4" />, link: "#" },
    { icon: <GithubIcon className="size-4" />, link: "#" },
    { icon: <YoutubeIcon className="size-4" />, link: "#" },
  ];

  return (
    <footer className="relative">
      <div className="mx-auto max-w-4xl bg-[radial-gradient(35%_80%_at_30%_0%,rgba(255,255,255,0.06),transparent)] md:border-x md:border-scai-border-dim/50">
        {/* Top divider */}
        <div className="absolute inset-x-0 h-px w-full bg-scai-border-dim/50" />

        <div className="grid max-w-4xl grid-cols-6 gap-6 p-4 pt-10 sm:p-6 sm:pt-12">
          {/* Brand + social — spans 4 cols on md */}
          <div className="col-span-6 flex flex-col gap-5 md:col-span-2">
            <a href="/" className="w-max">
              <img
                src="/logo.svg"
                alt="SEOContent.AI"
                className="h-6 opacity-80"
              />
            </a>
            <p className="max-w-sm font-mono text-sm text-scai-text-muted text-balance">
              The AI content engine for publishers, agencies, and marketing
              teams. Structured articles, not chat dumps.
            </p>
            <div className="flex gap-2">
              {socialLinks.map((item, i) => (
                <a
                  key={i}
                  className="rounded-md border border-scai-border-dim/50 p-1.5 text-scai-text-muted transition-colors hover:bg-scai-surface hover:text-scai-text-sec"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={item.link}
                >
                  {item.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div className="col-span-3 w-full sm:col-span-3 md:col-span-1">
            <span className="mb-1 text-xs text-scai-text-muted">Product</span>
            <div className="mt-2 flex flex-col gap-1">
              {product.map(({ href, title }, i) => (
                <a
                  key={i}
                  className="w-max py-1 text-sm text-scai-text-sec duration-200 hover:text-scai-text hover:underline"
                  href={href}
                >
                  {title}
                </a>
              ))}
            </div>
          </div>

          {/* Article Types */}
          <div className="col-span-3 w-full sm:col-span-3 md:col-span-1">
            <span className="mb-1 text-xs text-scai-text-muted">
              Article Types
            </span>
            <div className="mt-2 flex flex-col gap-1">
              {articleTypes.map(({ href, title }, i) => (
                <a
                  key={i}
                  className="w-max py-1 text-sm text-scai-text-sec duration-200 hover:text-scai-text hover:underline"
                  href={href}
                >
                  {title}
                </a>
              ))}
            </div>
          </div>

          {/* Resources */}
          <div className="col-span-3 w-full sm:col-span-3 md:col-span-1">
            <span className="mb-1 text-xs text-scai-text-muted">
              Resources
            </span>
            <div className="mt-2 flex flex-col gap-1">
              {resources.map(({ href, title }, i) => (
                <a
                  key={i}
                  className="w-max py-1 text-sm text-scai-text-sec duration-200 hover:text-scai-text hover:underline"
                  href={href}
                >
                  {title}
                </a>
              ))}
            </div>
          </div>

          {/* Company */}
          <div className="col-span-3 w-full sm:col-span-3 md:col-span-1">
            <span className="mb-1 text-xs text-scai-text-muted">Company</span>
            <div className="mt-2 flex flex-col gap-1">
              {company.map(({ href, title }, i) => (
                <a
                  key={i}
                  className="w-max py-1 text-sm text-scai-text-sec duration-200 hover:text-scai-text hover:underline"
                  href={href}
                >
                  {title}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom divider + copyright */}
        <div className="h-px w-full bg-scai-border-dim/50" />
        <div className="flex max-w-4xl flex-col justify-between gap-2 pb-5 pt-4">
          <p className="text-center text-xs font-thin text-scai-text-muted">
            &copy; SEOContent.AI. All rights reserved {year}
          </p>
        </div>
      </div>
    </footer>
  );
}
