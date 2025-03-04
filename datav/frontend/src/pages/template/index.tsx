// Copyright 2023 xobserve.io Team
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {
  Box,
  Button,
  Center,
  HStack,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Tab,
  TabIndicator,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  VStack,
  Wrap,
  useDisclosure,
  useMediaQuery,
  useToast,
} from '@chakra-ui/react'
import { useStore } from '@nanostores/react'
import { Input } from 'antd'
import CodeEditor from 'components/CodeEditor/CodeEditor'
import Empty from 'components/Empty'
import TagsFilter from 'components/TagsFilter'
import { FormSection } from 'components/form/Form'
import FormItem from 'components/form/Item'
import { clone, cloneDeep } from 'lodash'
import React, { useEffect, useMemo, useState } from 'react'
import { FaSearch } from 'react-icons/fa'
import { useSearchParam } from 'react-use'
import { $config } from 'src/data/configs/config'
import { MobileBreakpoint } from 'src/data/constants'
import { locale } from 'src/i18n/i18n'
import { commonMsg } from 'src/i18n/locales/en'
import TemplateCard from 'src/views/template/TemplateCard'
import TemplateEditor from 'src/views/template/TemplateEditor'
import { Scope } from 'types/scope'
import { Template, TemplateContent, TemplateType } from 'types/template'
import { getTemplatesApi } from 'utils/axios/api'
import { requestApi } from 'utils/axios/request'
import { addParamToUrl } from 'utils/url'
import { isEmpty } from 'utils/validate'

const TemplateStore = () => {
  const t = useStore(commonMsg)
  const lang = locale.get()
  const config = useStore($config)
  const urlType = useSearchParam('templateType')
  const urlId = useSearchParam('id')
  const [type, setType] = useState(Number(urlType ?? TemplateType.App))
  const [templates, setTemplates] = useState<Template[]>([])
  const [tempTemplate, setTempTemplate] = useState<Template>()
  const [tempTemplateConent, setTempTemplateConent] =
    useState<Partial<TemplateContent>>(null)
  const [applyTemplate, setApplyTemplate] = useState<Template>(null)
  const [newestVersion, setNewestVersion] = useState<string>(null)
  const [searchOpen, setSearchOpen] = useState<boolean>(false)
  const [searchTitle, setSearchTitle] = useState<string>(null)
  const [searchTags, setSearchTags] = useState<string[]>([])
  const { isOpen, onOpen, onClose } = useDisclosure()
  const {
    isOpen: isCreateContentOpen,
    onOpen: onCreateContentOpen,
    onClose: onCreateContentClose,
  } = useDisclosure()
  const toast = useToast()

  useEffect(() => {
    if (config) {
      loadTemplates()
    }
  }, [config, type])

  const loadTemplates = async () => {
    const res = await getTemplatesApi(type, Scope.Team, config.currentTeam)
    setTemplates(res.data)
  }

  const tabs = [
    {
      value: TemplateType.App,
      label: lang == 'zh' ? '应用模版' : 'Application',
    },
    {
      value: TemplateType.Dashboard,
      label: lang == 'zh' ? '仪表盘模版' : 'Dashboard',
    },
    {
      value: TemplateType.Panel,
      label: lang == 'zh' ? '图表模版' : 'Panel',
    },
  ]

  const onTemplateEdit = (t: Template) => {
    setTempTemplate(t)
    addParamToUrl({ id: t.id })
    onOpen()
  }

  const onTemplateChange = (t: Template) => {
    setTemplates(templates.map((item) => (item.id == t.id ? t : item)))
    setTempTemplate(null)
    onClose()
  }

  const onCreateContent = async (t: Template) => {
    const res = await requestApi.get(`/template/content/newest/${t.id}`)
    setNewestVersion(res.data)
    setTempTemplate(t)
    if (t.id != tempTemplateConent?.templateId) {
      setTempTemplateConent({
        templateId: t.id,
        description: '',
        content: '',
      })
    }
    onCreateContentOpen()
  }

  const onSubmitTemplateContent = async () => {
    if (!tempTemplateConent.version.match(/^\d+(?:\.\d+){2}$/)) {
      toast({
        title: lang == 'zh' ? '版本号格式错误' : 'Version format error',
        status: 'error',
        duration: 2000,
        isClosable: true,
      })
      return
    }

    if (tempTemplateConent.version <= newestVersion) {
      toast({
        title:
          lang == 'zh'
            ? '新版本号必须大于上个版本号'
            : 'New version must be greater than the previous version',
        status: 'error',
        duration: 2000,
        isClosable: true,
      })
      return
    }
    tempTemplateConent.content = JSON.stringify(
      JSON.parse(tempTemplateConent.content),
    )
    await requestApi.post('/template/content', tempTemplateConent)
    toast({
      title: lang == 'zh' ? '模版内容已更新' : 'Template content updated!',
      status: 'success',
      duration: 3000,
      isClosable: true,
    })
    setTempTemplate(null)
    setTempTemplateConent(null)
    onCreateContentClose()
  }

  const [isLargeScreen] = useMediaQuery(MobileBreakpoint)
  const onSearchTagsChange = (v: string[]) => {
    setSearchTags(v)
  }

  const tags = useMemo(() => {
    const result = []
    if (!templates) {
      return result
    }
    const tags = new Set()
    for (const t of templates) {
      if (isEmpty(t.tags)) {
        continue
      }

      for (const tag of t.tags ?? []) {
        tags.add(tag)
      }
    }

    for (const tag of tags) {
      result.push(tag)
    }
    return result
  }, [templates])

  const filterTemplates = useMemo(() => {
    if (isEmpty(searchTitle) && isEmpty(searchTags)) {
      return templates
    }

    const result = []
    for (const t of templates) {
      if (!isEmpty(searchTitle)) {
        if (
          !t.title.toLowerCase().includes(searchTitle.toLowerCase()) &&
          t.id != Number(searchTitle)
        ) {
          continue
        }
      }
      if (!isEmpty(searchTags)) {
        let match = false
        for (const tag of searchTags) {
          if (t.tags?.includes(tag)) {
            match = true
            break
          }
        }
        if (!match) {
          continue
        }
      }
      result.push(t)
    }
    return result
  }, [templates, searchTitle, searchTags])

  return (
    <>
      <Box>
        <VStack spacing='2' alignItems='center' p='4'>
          <Center>
            <Image src='/rocket.svg' alt='rocket' width={150} />
          </Center>
          <Center>
            <Text fontWeight={550} fontSize={30}>
              {t.templateStore}
            </Text>
          </Center>
          <Center>
            <Text
              fontWeight={500}
              fontSize={16}
              maxW={700}
              layerStyle='textSecondary'
            >
              {lang == 'zh'
                ? '选择一个模版快速创建图表、仪表盘甚至完整的应用'
                : 'Choose a template to quickly create a panel, a dashboard or even a whole application.'}
            </Text>
          </Center>
        </VStack>
        {searchOpen && (
          <Center>
            <HStack>
              <Input
                placeholder='search titles or template id'
                value={searchTitle}
                onChange={(e) => {
                  setSearchTitle(e.target.value)
                }}
              />

              <TagsFilter
                value={searchTags}
                tags={tags}
                onChange={(v: string[]) => {
                  onSearchTagsChange(v)
                }}
                minWidth={isLargeScreen ? '260px' : '48%'}
                displayCount={false}
              />
            </HStack>
          </Center>
        )}
        <Center position='relative'>
          <Box
            position='absolute'
            top='3'
            right='6'
            cursor='pointer'
            zIndex={1}
            onClick={() => setSearchOpen(!searchOpen)}
          >
            <FaSearch opacity='0.5' />
          </Box>
          <Tabs
            position='relative'
            variant='line'
            size='md'
            width='100%'
            defaultIndex={type - 1}
          >
            <TabList justifyContent='center' borderBottomWidth='1px'>
              {tabs.map((tab) => (
                <Tab
                  key={tab.value}
                  onClick={() => {
                    setType(tab.value)
                    addParamToUrl({ templateType: tab.value })
                  }}
                  borderBottom='2px solid'
                  borderColor='transparent'
                  _selected={{
                    // color: 'brand.500',
                    fontWeight: 500,
                    borderColor: 'brand.500',
                  }}
                >
                  {tab.label}
                </Tab>
              ))}
            </TabList>

            <TabPanels>
              {tabs.map((tab) => (
                <TabPanel key={tab.value}>
                  {filterTemplates.length > 0 ? (
                    <Wrap>
                      {filterTemplates.map((template) => (
                        <TemplateCard
                          key={template.id}
                          template={template}
                          selected={template.id == urlId}
                          width={['100%', '100%', '33%']}
                          onEdit={() => onTemplateEdit(template)}
                          onCreateContent={() => onCreateContent(template)}
                          onPush={() => {
                            setApplyTemplate(clone(template))
                          }}
                        />
                      ))}
                    </Wrap>
                  ) : (
                    <Empty />
                  )}
                </TabPanel>
              ))}
            </TabPanels>
          </Tabs>
        </Center>
      </Box>
      <Modal
        isOpen={isOpen}
        onClose={() => {
          setTempTemplate(null)
          addParamToUrl({ id: null })
          onClose()
        }}
      >
        <ModalOverlay />
        <ModalContent minWidth='700px'>
          <ModalHeader>
            {lang == 'zh' ? '编辑模版' : 'Edit template'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <TemplateEditor
              template={tempTemplate}
              onChange={onTemplateChange}
            />
          </ModalBody>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={isCreateContentOpen}
        onClose={() => {
          setTempTemplate(null)
          onCreateContentClose()
        }}
        size='full'
      >
        <ModalOverlay />
        {tempTemplateConent && (
          <ModalContent>
            <ModalHeader>
              {lang == 'zh' ? '更新模版内容' : 'Update template content'}
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Box
                sx={{
                  '.form-item-label': {
                    width: '120px',
                  },
                }}
              >
                <FormSection spacing={2}>
                  <FormItem
                    title={'模版 Id'}
                    alignItems='center'
                    maxWidth={600}
                  >
                    <Text>{tempTemplate?.id}</Text>
                  </FormItem>
                  <FormItem
                    title={t.itemName({ name: t.template })}
                    alignItems='center'
                    maxWidth={600}
                  >
                    <Text>{tempTemplate?.title}</Text>
                  </FormItem>
                  <FormItem title={'版本号'} alignItems='center' maxWidth={600}>
                    <Input
                      value={tempTemplateConent.version}
                      onChange={(e) => {
                        setTempTemplateConent({
                          ...tempTemplateConent,
                          version: e.target.value,
                        })
                      }}
                      placeholder={'x.y.z, e.g 1.0.3'}
                    />
                    <Text
                      minWidth='fit-content'
                      fontSize='0.9rem'
                      opacity='0.7'
                    >
                      {lang == 'zh' ? '上个版本' : 'previous version'}:{' '}
                      {newestVersion}
                    </Text>
                  </FormItem>
                  <FormItem
                    title={'更新内容描述'}
                    alignItems='center'
                    maxWidth={600}
                  >
                    <Input
                      value={tempTemplateConent.description}
                      onChange={(e) => {
                        setTempTemplateConent({
                          ...tempTemplateConent,
                          description: e.target.value,
                        })
                      }}
                      placeholder={
                        '请认真描述更新内容，未来如果需要回滚，会非常重要'
                      }
                    />
                  </FormItem>
                  <FormItem
                    title={'更新内容'}
                    desc={
                      '更新内容是 JSON 格式，可以通过图表、仪表盘等资源进行导出，复制导出的 JSON 数据，粘贴到此处'
                    }
                  >
                    <CodeEditor
                      value={tempTemplateConent.content}
                      language='json'
                      onChange={(v) => {
                        setTempTemplateConent({
                          ...tempTemplateConent,
                          content: v,
                        })
                      }}
                      height='500px'
                    />
                  </FormItem>
                </FormSection>
                <Button onClick={onSubmitTemplateContent} mt='4'>
                  {t.submit}
                </Button>
              </Box>
            </ModalBody>
          </ModalContent>
        )}
      </Modal>
    </>
  )
}

export default TemplateStore
