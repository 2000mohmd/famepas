import { Link } from "react-router-dom";
import famepassLogo from "@/assets/famepass-logo.jpeg";

const Footer = () => (
  <footer className="py-16 bg-card/50 border-t border-border">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <img src={famepassLogo} alt="FamePass" className="w-9 h-9 rounded-lg border border-border" />
            <span className="font-display font-bold text-lg text-foreground">
              Fame<span className="text-gold">Pass</span>
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
            Connecting influencers with premium venues for exclusive collaborations and unforgettable experiences.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="font-display font-semibold text-foreground">Discover</h4>
          <div className="space-y-2">
            <Link to="/venues" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Venues</Link>
            <Link to="/offers" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Offers</Link>
            <Link to="/categories" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Categories</Link>
            <Link to="/explore" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Explore Map</Link>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-display font-semibold text-foreground">Company</h4>
          <div className="space-y-2">
            <Link to="/about" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">About Us</Link>
            <Link to="/contact" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-display font-semibold text-foreground">Legal</h4>
          <div className="space-y-2">
            <Link to="/privacy-policy" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link to="/login" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Sign In</Link>
          </div>
        </div>
      </div>

      <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} FamePass. All rights reserved.</p>
        <Link to="/privacy-policy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
      </div>
    </div>
  </footer>
);

export default Footer;
