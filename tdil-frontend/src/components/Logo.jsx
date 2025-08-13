import { useNavigate } from 'react-router-dom';
import logoImg from '../assets/tdil-LOGO.png';

export default function Logo({ 
  size = 'md', // 'xs', 'sm', 'md', 'lg', 'xl'
  className = '',
  clickable = true,
  showText = true
}) {
  const navigate = useNavigate();
  
  const handleClick = () => {
    if (clickable) {
      navigate('/');
    }
  };

  const sizeClasses = {
    xs: 'h-6',
    sm: 'h-8',
    md: 'h-10', 
    lg: 'h-12',
    xl: 'h-16'
  };

  return (
    <img 
      src={logoImg}
      alt="tDIL Logo"
      className={`${sizeClasses[size]} ${clickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''} ${className}`}
      onClick={handleClick}
    />
  );
}
