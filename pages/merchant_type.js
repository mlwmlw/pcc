import {
  Box,
  Container,
  List,
  ListItem,
  Heading,
  Text
} from '@chakra-ui/react'
import Link from 'next/link'
import Head from 'next/head';

import { getApiUrl } from '../utils/api'

export default function MerchantTypes({ types = [] }) {
  return (
    <Container maxW="container.xl" mt={8}>
      <Head>
        <title>依營業類型檢索商家 - 開放政府標案</title>
      </Head>
      <Heading as="h1" mb={6}>商家類型列表</Heading>
      <Box p={4} borderWidth="1px" borderRadius="lg" className="sidebar-module sidebar-module-inset">
        <List spacing={2}>
          {types.map(type => (
            <ListItem key={type._id}>
              <Link href={`/merchant_type/${type._id}`}>
                <Text as="span" color="blue.500" cursor="pointer">
                  {type.name}
                </Text>
              </Link>
              {' '}({type.count})
            </ListItem>
          ))}
        </List>
      </Box>
    </Container>
  )
}

export async function getServerSideProps() {
  try {
    const response = await fetch(getApiUrl('/merchant_type'));
    const types = await response.json();
    
    return {
      props: {
        types: types || []
      }
    };
  } catch (error) {
    console.error('Error fetching merchant types:', error);
    return {
      props: {
        types: []
      }
    };
  }
}
