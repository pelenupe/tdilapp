import { useNavigate } from 'react-router-dom';

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
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base', 
    lg: 'text-lg',
    xl: 'text-xl'
  };

  const textSizes = {
    xs: 'text-[8px]',
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
    xl: 'text-base'
  };

  return (
    <div 
      className={`flex items-center gap-3 ${clickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''} ${className}`}
      onClick={handleClick}
    >
      {/* tDIL logo with colored letters */}
      <div className={`flex items-center font-bold ${sizeClasses[size]}`}>
        <span className="text-cyan-600">t</span>
        <span className="text-gray-800">D</span>
        <span className="text-yellow-500">i</span>
        <span className="text-cyan-600">L</span>
      </div>
      
      {/* Full text - only show on larger sizes */}
      {showText && (size === 'lg' || size === 'xl') && (
        <div className="flex flex-col">
          <span className={`font-bold text-gray-800 leading-none ${size === 'xl' ? 'text-sm' : 'text-xs'}`}>
            TALENT DEVELOPMENT
          </span>
          <span className={`text-gray-600 tracking-wider leading-none ${size === 'xl' ? 'text-xs' : 'text-[10px]'}`}>
            I M P A C T &nbsp;&nbsp; L A B
          </span>
        </div>
      )}
    </div>
  );
}
