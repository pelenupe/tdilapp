import SidebarMember from './SidebarMember';
import SidebarPartnerSchool from './SidebarPartnerSchool';
import SidebarSponsor from './SidebarSponsor';
import MobileHeader from './MobileHeader';

export default function PageLayout({ 
  children, 
  userType = 'member', 
  title, 
  subtitle, 
  headerActions,
  showPointsInHeader = true,
  userPoints = 0,
  headerContent
}) {
  // Render appropriate sidebar based on user type
  const renderSidebar = () => {
    switch (userType) {
      case 'partner_school':
        return <SidebarPartnerSchool />;
      case 'sponsor':
        return <SidebarSponsor />;
      default:
        return <SidebarMember />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <MobileHeader userType={userType} />
      
      {/* Left Sidebar */}
      {renderSidebar()}

      {/* Main Content */}
      <div className="transition-all duration-300 lg:ml-64 pt-16 lg:pt-0">
        {/* Page Header - Always flush with sidebar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              {title && <h1 className="text-2xl font-bold text-gray-900">{title}</h1>}
              {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-4">
              {showPointsInHeader && userPoints > 0 && (
                <div className="hidden sm:flex items-center gap-2">
                  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                  <span className="font-bold text-gray-900">{userPoints.toLocaleString()} points</span>
                </div>
              )}
              {headerActions}
            </div>
          </div>
          {headerContent && (
            <div className="mt-4">
              {headerContent}
            </div>
          )}
        </div>

        {/* Page Content */}
        <div className="p-4 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
