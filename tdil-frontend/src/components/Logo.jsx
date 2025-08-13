import { useNavigate } from 'react-router-dom';

export default function Logo({ 
  variant = 'full', // 'full', 'compact', 'initials'
  size = 'md', // 'xs', 'sm', 'md', 'lg', 'xl'
  className = '',
  clickable = true 
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

  const textSizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base', 
    lg: 'text-lg',
    xl: 'text-xl'
  };

  if (variant === 'initials') {
    return (
      <div 
        className={`flex items-center ${clickable ? 'cursor-pointer hover:opacity-80' : ''} ${className}`}
        onClick={handleClick}
      >
        <div className={`flex items-center font-bold ${textSizes[size]}`}>
          <span className="text-cyan-600">t</span>
          <span className="text-gray-800">D</span>
          <span className="text-yellow-500">i</span>
          <span className="text-cyan-600">L</span>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div 
        className={`flex items-center gap-2 ${clickable ? 'cursor-pointer hover:opacity-80' : ''} ${className}`}
        onClick={handleClick}
      >
        <div className={`flex items-center font-bold ${textSizes[size]}`}>
          <span className="text-cyan-600">t</span>
          <span className="text-gray-800">D</span>
          <span className="text-yellow-500">i</span>
          <span className="text-cyan-600">L</span>
        </div>
      </div>
    );
  }

  // Full logo with text
  return (
    <div 
      className={`flex items-center gap-3 ${clickable ? 'cursor-pointer hover:opacity-80' : ''} ${className}`}
      onClick={handleClick}
    >
      <div className={`flex items-center font-bold ${textSizes[size === 'xl' ? 'lg' : size]}`}>
        <span className="text-cyan-600">t</span>
        <span className="text-gray-800">D</span>
        <span className="text-yellow-500">i</span>
        <span className="text-cyan-600">L</span>
      </div>
      {size !== 'xs' && size !== 'sm' && (
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
