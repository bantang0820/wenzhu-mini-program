import { SearchOutlined } from '@ant-design/icons';
import { Button, Card, Input, Space, Table, Tag, Typography, message } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { fetchUsers } from '../api';
import type { UserItem } from '../types';
import { formatDateTime, formatNickname } from '../utils';

export function UsersPage() {
  const [keyword, setKeyword] = useState('');
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadUsers = useCallback(async (searchKeyword: string) => {
    try {
      setLoading(true);
      const result = await fetchUsers(searchKeyword);
      setUsers(result);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载用户列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers('');
  }, [loadUsers]);

  return (
    <Space direction="vertical" size={20} className="page-stack">
      <div>
        <Typography.Title level={3}>用户列表</Typography.Title>
        <Typography.Paragraph type="secondary">
          支持按昵称或 openid 搜索，快速查看用户会员状态。
        </Typography.Paragraph>
      </div>

      <Card>
        <Space wrap>
          <Input
            allowClear
            placeholder="输入昵称或 openid"
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={() => void loadUsers(keyword)}
            style={{ width: 320 }}
          />
          <Button type="primary" onClick={() => void loadUsers(keyword)}>
            搜索
          </Button>
          <Button onClick={() => {
            setKeyword('');
            void loadUsers('');
          }}>
            重置
          </Button>
        </Space>
      </Card>

      <Card>
        <Table<UserItem>
          rowKey="id"
          loading={loading}
          dataSource={users}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 960 }}
          columns={[
            {
              title: '昵称',
              dataIndex: 'nickname',
              width: 180,
              render: (value: string) => formatNickname(value)
            },
            {
              title: 'OpenID',
              dataIndex: 'openid',
              width: 280
            },
            {
              title: '是否会员',
              dataIndex: 'is_member',
              width: 120,
              render: (value: number) => (
                <Tag color={value === 1 ? 'success' : 'default'}>
                  {value === 1 ? '会员' : '非会员'}
                </Tag>
              )
            },
            {
              title: '会员到期时间',
              dataIndex: 'vip_expire_time',
              width: 200,
              render: (value: string | null) => formatDateTime(value)
            },
            {
              title: '注册时间',
              dataIndex: 'create_time',
              width: 180,
              render: (value: string) => formatDateTime(value)
            },
            {
              title: '最近登录',
              dataIndex: 'last_login_time',
              width: 180,
              render: (value: string) => formatDateTime(value)
            }
          ]}
        />
      </Card>
    </Space>
  );
}
