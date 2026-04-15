import famepassLogo from "@/assets/famepass-logo.jpeg";

const Footer = () => (
  <footer className="py-12 bg-card/50 border-t border-border">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <img src={famepassLogo} alt="FamePass" className="w-8 h-8 rounded-lg border border-border" />
          <span className="font-display font-bold text-foreground">
            Fame<span className="text-gold">Pass</span>
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} FamePass. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
