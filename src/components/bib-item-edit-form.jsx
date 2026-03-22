import { Form, Input, InputNumber, Select, DatePicker, Button, Space, Popconfirm, Tag } from "antd";
import { useEffect } from "react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { DeleteOutlined } from "@ant-design/icons";

const { TextArea } = Input;

export default function BibItemEditForm({ item, onSubmit, onCancel, onDelete }) {
    const { t } = useTranslation();
    const [form] = Form.useForm();

    const itemTypeOptions = [
        { label: 'book', value: 'book' },
        { label: 'journalArticle', value: 'journalArticle' },
        { label: 'magazineArticle', value: 'magazineArticle' },
        { label: 'newspaperArticle', value: 'newspaperArticle' },
        { label: 'thesis', value: 'thesis' },
        { label: 'letter', value: 'letter' },
        { label: 'manuscript', value: 'manuscript' },
        { label: 'invoice', value: 'invoice' },
        { label: 'email', value: 'email' },
        { label: 'instantMessage', value: 'instantMessage' },
        { label: 'forumPost', value: 'forumPost' },
        { label: 'blogPost', value: 'blogPost' },
        { label: 'podcast', value: 'podcast' },
        { label: 'videoRecording', value: 'videoRecording' },
        { label: 'audioRecording', value: 'audioRecording' },
        { label: 'conferencePaper', value: 'conferencePaper' },
        { label: 'document', value: 'document' },
        { label: 'encyclopediaArticle', value: 'encyclopediaArticle' },
        { label: 'dictionaryEntry', value: 'dictionaryEntry' },
    ];

    useEffect(() => {
        if (item) {
            form.setFieldsValue({
                item_type: item.item_type,
                title: item.title,
                author: item.author,
                abstract_note: item.abstract_note,
                publication: item.publication,
                date: item.date ? dayjs(item.date) : null,
                volume: item.volume,
                issue: item.issue,
                pages: item.pages,
                doi: item.doi,
                url: item.url,
                isbn: item.isbn,
                issn: item.issn,
                archive: item.archive,
                archive_location: item.archive_location,
                library_catalog: item.library_catalog,
                call_number: item.call_number,
                language: item.language,
                short_title: item.short_title,
                series: item.series,
                series_title: item.series_title,
                publisher: item.publisher,
                place: item.place,
                notes: item.notes,
                tags: item.tags?.join(', '),
                related: item.related,
                file_attachments: item.file_attachments ? JSON.stringify(item.file_attachments, null, 2) : '',
                extra: item.extra ? JSON.stringify(item.extra, null, 2) : '',
                dataset: item.dataset || '',
            });
        }
    }, [item, form]);

    const handleFinish = (values) => {
        // Convert dayjs back to string
        const formattedValues = {
            ...values,
            date: values.date ? values.date.format('YYYY-MM-DD') : null,
            tags: values.tags ? values.tags.split(',').map(t => t.trim()).filter(t => t) : [],
            file_attachments: values.file_attachments ? JSON.parse(values.file_attachments) : [],
            extra: values.extra ? JSON.parse(values.extra) : {},
        };
        onSubmit(formattedValues);
    };

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={handleFinish}
            style={{ maxHeight: '70vh', overflowY: 'auto' }}
        >
            <Form.Item
                name="title"
                label={t("title")}
                rules={[{ required: true, message: t("Please enter a title") }]}
            >
                <Input placeholder={t("e_g_the_art_of_computer_programming")} />
            </Form.Item>

            <Form.Item
                name="author"
                label={t("author")}
            >
                <Input placeholder={t("e_g_donald_e_knuth")} />
            </Form.Item>

            <Form.Item
                name="item_type"
                label={t("item_type")}
            >
                <Select
                    placeholder={t("e_g_book_journalarticle")}
                    options={itemTypeOptions}
                    showSearch
                    filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                />
            </Form.Item>

            <Form.Item
                name="publication"
                label={t("publication")}
            >
                <Input placeholder={t("e_g_addison_wesley")} />
            </Form.Item>

            <Form.Item
                name="date"
                label={t("date")}
            >
                <DatePicker
                    placeholder={t("e_g_2011_03_04")}
                    style={{ width: '100%' }}
                    format="YYYY-MM-DD"
                />
            </Form.Item>

            <Form.Item
                name="doi"
                label={t("doi")}
            >
                <Input placeholder={t("e_g_10_1002_9781118175324")} />
            </Form.Item>

            <Form.Item
                name="url"
                label={t("url")}
            >
                <Input placeholder={t("e_g_https_example_com")} />
            </Form.Item>

            <Form.Item
                name="isbn"
                label={t("isbn")}
            >
                <Input placeholder={t("e_g_978_0201896831")} />
            </Form.Item>

            <Form.Item
                name="issn"
                label={t("issn")}
            >
                <Input placeholder={t("e_g_1234_5678")} />
            </Form.Item>

            <Form.Item
                name="volume"
                label={t("volume")}
            >
                <InputNumber placeholder={t("e_g_1")} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
                name="issue"
                label={t("issue")}
            >
                <InputNumber placeholder={t("e_g_1")} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
                name="pages"
                label={t("pages")}
            >
                <Input placeholder={t("e_g_1_100")} />
            </Form.Item>

            <Form.Item
                name="abstract_note"
                label={t("abstract_note")}
            >
                <TextArea rows={3} placeholder={t("Enter abstract...")} />
            </Form.Item>

            <Form.Item
                name="notes"
                label={t("notes")}
            >
                <TextArea rows={2} placeholder={t("Enter notes...")} />
            </Form.Item>

            <Form.Item
                name="tags"
                label={t("tags")}
            >
                <Input placeholder={t("e_g_computer_programming_algorithms")} />
            </Form.Item>

            <Form.Item
                name="series"
                label={t("series")}
            >
                <Input placeholder={t("e_g_the_art_of_computer_programming")} />
            </Form.Item>

            <Form.Item
                name="series_title"
                label={t("series_title")}
            >
                <Input placeholder={t("e_g_fundamentals")} />
            </Form.Item>

            <Form.Item
                name="publisher"
                label={t("publisher")}
            >
                <Input placeholder={t("e_g_addison_wesley")} />
            </Form.Item>

            <Form.Item
                name="place"
                label={t("place")}
            >
                <Input placeholder={t("e_g_reading_massachusetts")} />
            </Form.Item>

            <Form.Item
                name="archive"
                label={t("archive")}
            >
                <Input placeholder={t("e_g_library_of_congress")} />
            </Form.Item>

            <Form.Item
                name="archive_location"
                label={t("archive_location")}
            >
                <Input placeholder={t("e_g_box_1_folder_2")} />
            </Form.Item>

            <Form.Item
                name="library_catalog"
                label={t("library_catalog")}
            >
                <Input placeholder={t("e_g_worldcat")} />
            </Form.Item>

            <Form.Item
                name="call_number"
                label={t("call_number")}
            >
                <Input placeholder={t("e_g_dc123_456")} />
            </Form.Item>

            <Form.Item
                name="language"
                label={t("language")}
            >
                <Input placeholder={t("e_g_en")} />
            </Form.Item>

            <Form.Item
                name="short_title"
                label={t("short_title")}
            >
                <Input placeholder={t("e_g_tocp")} />
            </Form.Item>

            <Form.Item
                name="dataset"
                label={t("dataset")}
            >
                <Input placeholder={t("Enter dataset name...")} />
            </Form.Item>

            <Form.Item
                name="related"
                label={t("related")}
            >
                <TextArea rows={2} placeholder={t("Enter related items...")} />
            </Form.Item>

            <Form.Item
                name="file_attachments"
                label={t("file_attachments")}
            >
                <TextArea rows={3} placeholder={t("Enter file attachments as JSON...")} />
            </Form.Item>

            <Form.Item
                name="extra"
                label={t("extra")}
            >
                <TextArea rows={3} placeholder={t("Enter extra data as JSON...")} />
            </Form.Item>

            <Form.Item>
                <Space>
                    <Button type="primary" htmlType="submit">
                        {t("save")}
                    </Button>
                    <Button onClick={onCancel}>
                        {t("cancel")}
                    </Button>
                    {item && (
                        <Popconfirm
                            title={t("Are you sure you want to delete this item?")}
                            onConfirm={() => onDelete(item.id)}
                            okText={t("confirm")}
                            cancelText={t("cancel")}
                        >
                            <Button danger icon={<DeleteOutlined />}>
                                {t("delete")}
                            </Button>
                        </Popconfirm>
                    )}
                </Space>
            </Form.Item>
        </Form>
    );
}
