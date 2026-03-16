import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
  message
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { fetchMembers, fetchUsers, updateMembership } from '../api';
import type { MemberItem, UpdateMembershipPayload, UserItem } from '../types';
import { formatDateTime, formatNickname } from '../utils';

interface MembershipModalState {
  open: boolean;
  user: UserItem | MemberItem | null;
  action: 'grant' | 'extend';
}

export function MembersPage() {
  const [memberKeyword, setMemberKeyword] = useState('');
  const [candidateKeyword, setCandidateKeyword] = useState('');
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [candidateUsers, setCandidateUsers] = useState<UserItem[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalState, setModalState] = useState<MembershipModalState>({
    open: false,
    user: null,
    action: 'grant'
  });
  const [form] = Form.useForm<Pick<UpdateMembershipPayload, 'duration'>>();

  const loadMembers = useCallback(async (keyword: string) => {
    try {
      setMembersLoading(true);
      const result = await fetchMembers(keyword);
      setMembers(result);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载会员列表失败');
    } finally {
      setMembersLoading(false);
    }
  }, []);

  const loadCandidateUsers = useCallback(async (keyword: string) => {
    try {
      setCandidateLoading(true);
      const result = await fetchUsers(keyword);
      setCandidateUsers(result);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载用户失败');
    } finally {
      setCandidateLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMembers('');
  }, [loadMembers]);

  const openActionModal = (user: UserItem | MemberItem, action: 'grant' | 'extend') => {
    setModalState({
      open: true,
      user,
      action
    });
    form.setFieldsValue({
      duration: 30
    });
  };

  const closeActionModal = () => {
    setModalState({
      open: false,
      user: null,
      action: 'grant'
    });
    form.resetFields();
  };

  const handleSubmit = async () => {
    if (!modalState.user) {
      return;
    }

    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await updateMembership({
        userId: modalState.user.id,
        duration: values.duration,
        action: modalState.action
      });

      message.success(modalState.action === 'extend' ? '会员已延长' : '会员已开通');
      closeActionModal();
      void loadMembers(memberKeyword);

      if (candidateKeyword.trim()) {
        void loadCandidateUsers(candidateKeyword);
      }
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Space direction="vertical" size={20} className="page-stack">
      <div>
        <Typography.Title level={3}>会员管理</Typography.Title>
        <Typography.Paragraph type="secondary">
          先搜索用户再手动开通会员，现有会员可以继续延长到期时间。
        </Typography.Paragraph>
      </div>

      <Card title="手动开通会员">
        <Space wrap>
          <Input
            allowClear
            placeholder="搜索昵称或 openid"
            prefix={<SearchOutlined />}
            value={candidateKeyword}
            onChange={(event) => setCandidateKeyword(event.target.value)}
            onPressEnter={() => void loadCandidateUsers(candidateKeyword)}
            style={{ width: 320 }}
          />
          <Button type="primary" onClick={() => void loadCandidateUsers(candidateKeyword)}>
            搜索用户
          </Button>
        </Space>

        <Table<UserItem>
          rowKey="id"
          loading={candidateLoading}
          dataSource={candidateUsers}
          pagination={{ pageSize: 5, showSizeChanger: false }}
          scroll={{ x: 920 }}
          style={{ marginTop: 20 }}
          columns={[
            {
              title: '昵称',
              dataIndex: 'nickname',
              width: 160,
              render: (value: string) => formatNickname(value)
            },
            {
              title: 'OpenID',
              dataIndex: 'openid',
              width: 280
            },
            {
              title: '当前状态',
              dataIndex: 'is_member',
              width: 120,
              render: (value: number) => (
                <Tag color={value === 1 ? 'success' : 'default'}>
                  {value === 1 ? '会员中' : '未开通'}
                </Tag>
              )
            },
            {
              title: '到期时间',
              dataIndex: 'vip_expire_time',
              width: 180,
              render: (value: string | null) => formatDateTime(value)
            },
            {
              title: '操作',
              key: 'action',
              width: 140,
              render: (_, record) => (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => openActionModal(record, record.is_member === 1 ? 'extend' : 'grant')}
                >
                  {record.is_member === 1 ? '延长会员' : '开通会员'}
                </Button>
              )
            }
          ]}
        />
      </Card>

      <Card
        title="会员用户列表"
        extra={
          <Space wrap>
            <Input
              allowClear
              placeholder="筛选会员昵称或 openid"
              value={memberKeyword}
              onChange={(event) => setMemberKeyword(event.target.value)}
              onPressEnter={() => void loadMembers(memberKeyword)}
              style={{ width: 260 }}
            />
            <Button onClick={() => void loadMembers(memberKeyword)}>搜索</Button>
          </Space>
        }
      >
        <Table<MemberItem>
          rowKey="id"
          loading={membersLoading}
          dataSource={members}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 860 }}
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
              title: '会员到期时间',
              dataIndex: 'vip_expire_time',
              width: 200,
              render: (value: string) => formatDateTime(value)
            },
            {
              title: '最近登录',
              dataIndex: 'last_login_time',
              width: 180,
              render: (value: string) => formatDateTime(value)
            },
            {
              title: '操作',
              key: 'action',
              width: 140,
              render: (_, record) => (
                <Button onClick={() => openActionModal(record, 'extend')}>
                  延长会员
                </Button>
              )
            }
          ]}
        />
      </Card>

      <Modal
        title={modalState.action === 'extend' ? '延长会员时间' : '开通会员'}
        open={modalState.open}
        onCancel={closeActionModal}
        onOk={() => void handleSubmit()}
        okText={modalState.action === 'extend' ? '确认延长' : '确认开通'}
        confirmLoading={submitting}
      >
        <Typography.Paragraph>
          当前用户：{modalState.user ? `${formatNickname(modalState.user.nickname)} (${modalState.user.openid})` : '-'}
        </Typography.Paragraph>

        <Form form={form} layout="vertical">
          <Form.Item
            label="增加会员天数"
            name="duration"
            rules={[{ required: true, message: '请输入会员天数' }]}
          >
            <InputNumber min={1} max={3650} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
