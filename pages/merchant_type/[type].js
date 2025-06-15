import {
  Box,
  Container,
  Grid,
  GridItem,
  List,
  ListItem,
  Link as ChakraLink,
  Text
} from '@chakra-ui/react'
import Link from 'next/link'
import Head from 'next/head';

import { DataTable } from '../../components/DataTable'
import { getApiUrl } from '../../utils/api'
import { useMemo } from 'react'

export default function MerchantTypeDetail({ merchants = [], types = [], type, selectedTypeName }) {
  const columns = useMemo(() => [
    {
      header: '廠商',
      accessorKey: 'name',
      cell: info => (
        <ChakraLink 
          href={`http://company.g0v.ronny.tw/id/${info.row.original._id}`}
          isExternal
          color="blue.500"
        >
          {info.getValue()}
        </ChakraLink>
      )
    },
    {
      header: '單位',
      accessorKey: 'org',
      cell: info => info.getValue() || '-'
    },
    {
      header: '電話',
      accessorKey: 'phone',
      cell: info => info.getValue() || '-'
    },
    {
      header: '公司所在地',
      accessorKey: 'address',
      cell: info => info.getValue() || '-'
    },
    {
      header: '標案檢索',
      accessorKey: '_id',
      cell: info => (
        <Link href={`/merchants/${info.getValue()}`}>
          <Text as="span" color="blue.500" cursor="pointer">
            前往
          </Text>
        </Link>
      )
    }
  ], []);

  return (
    <Container maxW="container.xl" mt={8}>
      <Head>
        <title>{selectedTypeName} 廠商列表 - 開放政府標案</title>
      </Head>
      <Grid templateColumns={{ base: "1fr", md: "2fr 1fr" }} gap={8}>
        <GridItem>
          {selectedTypeName && (
            <Box mb={4} fontWeight="bold" fontSize="xl">
              {selectedTypeName} 廠商列表
            </Box>
          )}
          <DataTable 
            data={merchants} 
            columns={columns}
            pageSize={20}
          />
          {merchants.length === 0 && type && (
            <Box mt={4} textAlign="center">
              無資料
            </Box>
          )}
        </GridItem>
        <GridItem>
          <Box p={4} borderWidth="1px" borderRadius="lg" className="sidebar-module sidebar-module-inset">
            <List spacing={2}>
              {types.map(t => (
                <ListItem key={t._id}>
                  <Link href={`/merchant_type/${t._id}`}>
                    <Text
                      as="span"
                      color="blue.500"
                      cursor="pointer"
                      fontWeight={t._id === type ? "bold" : "normal"}
                    >
                      {t.name}
                    </Text>
                  </Link>
                  {' '}({t.count})
                </ListItem>
              ))}
            </List>
          </Box>
        </GridItem>
      </Grid>
    </Container>
  )
}

export async function getServerSideProps(context) {
  const { type } = context.params;
  const defaultProps = {
    props: {
      merchants: [],
      types: [],
      type,
      selectedTypeName: ''
    }
  };
  
  try {
    // 取得所有商家類型
    const typesRes = await fetch(getApiUrl('/merchant_type'));
    const types = await typesRes.json();

    const selectedType = types.find(t => t._id === type);
    const selectedTypeName = selectedType ? selectedType.name : '';
  // 取得特定類型的商家
    const merchantsRes = await fetch(getApiUrl(`/merchant_type/${type}`));
    const merchants = await merchantsRes.json();


    return {
      props: {
        merchants: merchants || [],
        types: types || [],
        type,
        selectedTypeName
      }
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    return {
      props: {
        merchants: [],
        types: types || [],
        type,
        selectedTypeName
      }
    }  
  }
}
