import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Typography, message } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../api';
import { setAdminToken } from '../auth';

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleFinish = async (values: { username: string; password: string }) => {
    try {
      setLoading(true);
      const result = await adminLogin(values);
      setAdminToken(result.token);
      message.success('登录成功');
      navigate('/users', { replace: true });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-backdrop" />
      <Card bordered={false} className="login-card">
        <div className="login-card__header">
          <Typography.Title level={2}>稳住 Admin</Typography.Title>
          <Typography.Paragraph type="secondary">
            管理后台登录
          </Typography.Paragraph>
        </div>

        <Form
          layout="vertical"
          onFinish={handleFinish}
        >
          <Form.Item
            label="管理员账号"
            name="username"
            rules={[{ required: true, message: '请输入管理员账号' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="请输入账号"
              size="large"
              autoComplete="off"
            />
          </Form.Item>

          <Form.Item
            label="管理员密码"
            name="password"
            rules={[{ required: true, message: '请输入管理员密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入密码"
              size="large"
              autoComplete="new-password"
            />
          </Form.Item>

          <Button type="primary" htmlType="submit" block size="large" loading={loading}>
            登录后台
          </Button>
        </Form>
      </Card>
    </div>
  );
}
