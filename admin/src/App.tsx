import {
  CreditCardOutlined,
  LogoutOutlined,
  TeamOutlined,
  UserOutlined
} from '@ant-design/icons';
import { App as AntApp, Button, ConfigProvider, Layout, Menu, Space, Typography, message, theme } from 'antd';
import { useEffect, useEffectEvent, useState } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { fetchAdminProfile } from './api';
import { clearAdminToken, isAdminLoggedIn } from './auth';
import { LoginPage } from './pages/LoginPage';
import { MembersPage } from './pages/MembersPage';
import { RedeemCodesPage } from './pages/RedeemCodesPage';
import { UsersPage } from './pages/UsersPage';

const routeTitleMap: Record<string, string> = {
  '/users': '用户列表',
  '/redeem-codes': '兑换码管理',
  '/members': '会员管理'
};

function RequireAuth() {
  if (!isAdminLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function AdminShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('admin');
  const {
    token: { colorBgContainer }
  } = theme.useToken();

  const loadProfile = useEffectEvent(async () => {
    try {
      const profile = await fetchAdminProfile();
      setUsername(profile.username);
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    }
  });

  useEffect(() => {
    void loadProfile();
  }, []);

  const handleLogout = () => {
    clearAdminToken();
    navigate('/login', { replace: true });
  };

  return (
    <Layout className="admin-shell">
      <Layout.Sider width={232} className="admin-sider" theme="light">
        <div className="brand-block">
          <Typography.Title level={4}>稳住 Admin</Typography.Title>
          <Typography.Text type="secondary">给自己用的轻量管理端</Typography.Text>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={[
            {
              key: '/users',
              icon: <UserOutlined />,
              label: '用户列表'
            },
            {
              key: '/redeem-codes',
              icon: <CreditCardOutlined />,
              label: '兑换码管理'
            },
            {
              key: '/members',
              icon: <TeamOutlined />,
              label: '会员管理'
            }
          ]}
          onClick={({ key }) => navigate(key)}
        />

        <div className="sider-footer">
          <Typography.Text type="secondary">当前管理员：{username}</Typography.Text>
          <Button icon={<LogoutOutlined />} onClick={handleLogout}>
            退出登录
          </Button>
        </div>
      </Layout.Sider>

      <Layout className="admin-main">
        <Layout.Header className="admin-header" style={{ background: colorBgContainer }}>
          <Space direction="vertical" size={0}>
            <Typography.Text className="admin-header__eyebrow">简单可用，优先把事做完</Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {routeTitleMap[location.pathname] || 'Admin'}
            </Typography.Title>
          </Space>
        </Layout.Header>

        <Layout.Content className="admin-content">
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  );
}

function LoginRedirect() {
  return isAdminLoggedIn() ? <Navigate to="/users" replace /> : <LoginPage />;
}

export default function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#356859',
          borderRadius: 16,
          colorInfo: '#356859',
          colorBgLayout: '#f4f1ea',
          fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
        }
      }}
    >
      <AntApp>
        <Routes>
          <Route path="/login" element={<LoginRedirect />} />
          <Route element={<RequireAuth />}>
            <Route element={<AdminShell />}>
              <Route path="/" element={<Navigate to="/users" replace />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/redeem-codes" element={<RedeemCodesPage />} />
              <Route path="/members" element={<MembersPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AntApp>
    </ConfigProvider>
  );
}
