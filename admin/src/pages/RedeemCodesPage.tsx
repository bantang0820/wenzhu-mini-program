import { CopyOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { fetchRedeemCodes, generateRedeemCodes } from '../api';
import type { GenerateCodesPayload, RedeemCodeItem } from '../types';
import { formatDateTime } from '../utils';

type UsedFilter = 'all' | 'used' | 'unused';

export function RedeemCodesPage() {
  const [filter, setFilter] = useState<UsedFilter>('all');
  const [codes, setCodes] = useState<RedeemCodeItem[]>([]);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<GenerateCodesPayload>();

  const loadCodes = useCallback(async (currentFilter: UsedFilter) => {
    try {
      setLoading(true);
      const result = await fetchRedeemCodes(currentFilter);
      setCodes(result);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载兑换码失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCodes(filter);
  }, [filter, loadCodes]);

  const handleGenerate = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const result = await generateRedeemCodes(values);
      setGeneratedCodes(result.codes);
      message.success(`已生成 ${result.codes.length} 个兑换码`);
      setModalOpen(false);
      form.resetFields();
      void loadCodes(filter);
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedCodes.length) {
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedCodes.join('\n'));
      message.success('兑换码已复制');
    } catch {
      message.error('复制失败，请手动复制');
    }
  };

  return (
    <Space direction="vertical" size={20} className="page-stack">
      <div>
        <Typography.Title level={3}>兑换码管理</Typography.Title>
        <Typography.Paragraph type="secondary">
          查看兑换码状态，按需生成新的会员兑换码。
        </Typography.Paragraph>
      </div>

      <Card>
        <Space wrap>
          <Select<UsedFilter>
            value={filter}
            onChange={setFilter}
            options={[
              { label: '全部', value: 'all' },
              { label: '未使用', value: 'unused' },
              { label: '已使用', value: 'used' }
            ]}
            style={{ width: 160 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            生成兑换码
          </Button>
        </Space>
      </Card>

      {generatedCodes.length > 0 ? (
        <Card
          title="最近生成"
          extra={
            <Button icon={<CopyOutlined />} onClick={() => void handleCopy()}>
              复制全部
            </Button>
          }
        >
          <Input.TextArea value={generatedCodes.join('\n')} autoSize={{ minRows: 4, maxRows: 10 }} readOnly />
        </Card>
      ) : null}

      <Card>
        <Table<RedeemCodeItem>
          rowKey="id"
          loading={loading}
          dataSource={codes}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 1040 }}
          columns={[
            {
              title: '兑换码',
              dataIndex: 'code',
              width: 180
            },
            {
              title: '状态',
              dataIndex: 'status',
              width: 110,
              render: (value: number) => (
                <Tag color={value === 1 ? 'processing' : 'success'}>
                  {value === 1 ? '已使用' : '未使用'}
                </Tag>
              )
            },
            {
              title: '类型',
              dataIndex: 'type',
              width: 120
            },
            {
              title: '时长',
              dataIndex: 'duration',
              width: 120,
              render: (value: number) => `${value} 天`
            },
            {
              title: '是否已使用',
              dataIndex: 'status',
              width: 120,
              render: (value: number) => (value === 1 ? '是' : '否')
            },
            {
              title: '使用人',
              dataIndex: 'used_by',
              width: 220,
              render: (value: string | null) => value || '-'
            },
            {
              title: '使用时间',
              dataIndex: 'used_time',
              width: 180,
              render: (value: string | null) => formatDateTime(value)
            },
            {
              title: '创建时间',
              dataIndex: 'created_at',
              width: 180,
              render: (value: string) => formatDateTime(value)
            }
          ]}
        />
      </Card>

      <Modal
        title="生成兑换码"
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        onOk={() => void handleGenerate()}
        okText="生成"
        confirmLoading={submitting}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            count: 10,
            type: 'manual',
            duration: 30
          }}
        >
          <Form.Item
            label="生成数量"
            name="count"
            rules={[{ required: true, message: '请输入生成数量' }]}
          >
            <InputNumber min={1} max={100} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="兑换码类型"
            name="type"
            rules={[{ required: true, message: '请输入兑换码类型' }]}
          >
            <Input placeholder="例如：manual / annual / campaign" />
          </Form.Item>

          <Form.Item
            label="会员时长（天）"
            name="duration"
            rules={[{ required: true, message: '请输入会员时长' }]}
          >
            <InputNumber min={1} max={3650} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
