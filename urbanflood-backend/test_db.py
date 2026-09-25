from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.drainage import NalaSegment

engine = create_engine('postgresql+pg8000://postgres:postgres@localhost:5432/urbanflood')
Session = sessionmaker(bind=engine)
session = Session()

nalas = session.query(NalaSegment).limit(5).all()
for n in nalas:
    print(n.nala_id, n.nala_name)
