import { useNavigate } from 'react-router-dom';
import logoImg from '../assets/tdil-LOGO.png';
import iconImg from '../assets/tdil-icon.png';

// variant="logo" → full horizontal logo (used on Login/Register/public pages)
// variant="icon" → square icon only (used inside app sidebar)
export default function Logo({ 
  size = 'md',       // 'xs', 'sm', 'md', 'lg', 'xl'
  variant = 'logo',  // 'logo' | 'icon'
  className = '',
  clickable = true,
  style = {}
}) {
  const navigate = useNavigate();
  
  const handleClick = () => {
    if (clickable) navigate('/dashboard');
  };

  // Logo sizes (wide image — constrain by height, let width be auto)
  const logoHeightClasses = {
    xs: 'h-6',
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-12',
    xl: 'h-16'
  };

  // Icon sizes (square image — constrain both dimensions equally)
  const iconSizeClasses = {
    xs: 'h-7 w-7',
    sm: 'h-9 w-9',
    md: 'h-11 w-11',
    lg: 'h-13 w-13',
    xl: 'h-16 w-16'
  };

  const src = variant === 'icon' ? iconImg : logoImg;
  const sizeClass = variant === 'icon'
    ? (iconSizeClasses[size] || iconSizeClasses.md)
    : (logoHeightClasses[size] || logoHeightClasses.md);

  return (
    <img 
      src={src}
      alt="tDIL"
      className={`object-contain flex-shrink-0 ${!style.width ? sizeClass : ''} ${clickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''} ${className}`}
      style={style}
      onClick={handleClick}
    />
  );
}
